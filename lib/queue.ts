import { getSql } from './db'

export interface InvestigationJob {
  projectId: string
  logId?: string
  clusterId?: string
  investigationId?: string
  parentInvestigationId?: string
  attempt?: number
  eventId?: string
}

export interface QueueJob<T> {
  id: string
  data: T
}

export interface QueueEnqueueResult {
  jobId: string
  investigationId?: string
  status?: 'queued' | 'failed'
}

const pendingJobs: QueueJob<InvestigationJob>[] = []
let registeredProcessor: ((job: InvestigationJob) => Promise<void>) | null = null
let activeCount = 0
let completedCount = 0
let failedCount = 0

// Runs a job through the registered processor without ever throwing, and
// tracks it in the aggregate counters so getJobCounts() reports reality.
async function runJob(processor: (job: InvestigationJob) => Promise<void>, job: QueueJob<InvestigationJob>) {
  activeCount++
  try {
    await processor(job.data)
    completedCount++
  } catch (error) {
    failedCount++
    console.error('[v0] Investigation processing error:', error)
  } finally {
    activeCount = Math.max(0, activeCount - 1)
  }
}

// Attempts to process all buffered jobs with the newly registered processor.
// Call this from both process() and setupInvestigationProcessor() so jobs
// buffered before registration are drained instead of leaking in memory.
async function drainPendingJobs(processor: (job: InvestigationJob) => Promise<void>) {
  while (pendingJobs.length > 0) {
    const job = pendingJobs.shift()
    if (job) await runJob(processor, job)
  }
}

export const queue = {
  async add(name: string, data: unknown) {
    return { id: `${name}-${Date.now()}`, data } as QueueJob<unknown>
  },
}

export const investigationQueue = {
  async add(data: InvestigationJob, options?: { jobId?: string }) {
    const job = { id: options?.jobId ?? `inv-${data.logId}-${Date.now()}`, data }

    if (!registeredProcessor) {
      // No processor registered yet — buffer the job until one is wired up.
      // This covers cold starts where a worker module has not initialized.
      pendingJobs.push(job)
      return job
    }

    // Best-effort inline processing. Never block or throw on failure so a
    // downed/inaccessible queue worker cannot take down log ingestion.
    void runJob(registeredProcessor, job).catch((error) => {
      console.error('[v0] Inline investigation processing error:', error)
    })

    return job
  },
  async getJobCounts() {
    return {
      waiting: pendingJobs.length,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
    }
  },
  async process(processor: (job: InvestigationJob) => Promise<void>) {
    registeredProcessor = processor
    await drainPendingJobs(processor)
  },
  async close() {
    registeredProcessor = null
    pendingJobs.length = 0
    activeCount = 0
    completedCount = 0
    failedCount = 0
  },
}

export async function queueInvestigation(job: InvestigationJob): Promise<QueueEnqueueResult> {
  let investigationId = job.investigationId

  try {
    if (!investigationId && job.logId) {
      const sql = getSql()
      const [log] = await sql`
        SELECT endpoint, user_id FROM public.api_logs WHERE id = ${job.logId} LIMIT 1
      `
      const [created] = await sql`
        INSERT INTO public.investigations (
          project_id,
          user_id,
          cluster_id,
          log_id,
          parent_investigation_id,
          question,
          status,
          attempt
        )
        VALUES (
          ${job.projectId},
          ${log?.user_id ?? null},
          ${job.clusterId ?? null},
          ${job.logId},
          ${job.parentInvestigationId ?? null},
          ${log?.endpoint ?? 'Unknown error'},
          'queued',
          ${job.attempt ?? 1}
        )
        RETURNING id
      `
      investigationId = created.id
      job.investigationId = investigationId
    }

    await investigationQueue.add(job, { jobId: `inv-${job.logId}-${Date.now()}` })
    return { jobId: `inv-${job.logId}-${Date.now()}`, investigationId, status: 'queued' }
  } catch (error) {
    console.error('[v0] Queue push failed:', error)
    return { jobId: `inv-${job.logId}-${Date.now()}`, investigationId, status: 'failed' }
  }
}

export async function getQueueStats() {
  return investigationQueue.getJobCounts()
}

export async function queueEventAnalysis(job: InvestigationJob): Promise<QueueEnqueueResult> {
  const queuedJob = await investigationQueue.add(job, {
    jobId: `evt-${job.eventId ?? Date.now()}-${Date.now()}`,
  })
  return { jobId: queuedJob.id, status: 'queued' }
}

export async function setupInvestigationProcessor(
  processor: (job: InvestigationJob) => Promise<void>,
): Promise<void> {
  registeredProcessor = processor
  // Drain any jobs buffered before the processor was registered (e.g. during a
  // cold start where ingestion beat worker registration). Fire-and-forget so
  // registration itself never blocks.
  void drainPendingJobs(processor).catch((error) => {
    console.error('[v0] Pending job drain failed:', error)
  })
}

export async function closeQueue(): Promise<void> {
  await investigationQueue.close()
}

/**
 * Recovery sweep for serverless runtime. When a lambda is frozen or killed
 * after the HTTP response is sent, investigations it was working on can be
 * left stuck in 'queued' or 'in_progress' forever. This finds those stale
 * rows and re-enqueues them so a later request finishes the work.
 *
 * Stale means: still 'queued' (never picked up) or still 'in_progress'
 * (worker died mid-run) and older than `maxAgeMs`. Queued rows are safe to
 * re-run immediately; in_progress rows are only recovered once they are old
 * enough that the original lambda is certainly dead (avoids double PRs).
 *
 * Returns the number of rows re-enqueued.
 */
export async function recoverStaleInvestigations(maxAgeMs = 15 * 60 * 1000): Promise<number> {
  const sql = getSql()
  const queuedThreshold = new Date(Date.now() - maxAgeMs).toISOString()
  const inProgressThreshold = new Date(Date.now() - maxAgeMs).toISOString()

  const stale = await sql`
    SELECT id, project_id, cluster_id, log_id, status
    FROM public.investigations
    WHERE status IN ('queued', 'in_progress')
      AND created_at < ${queuedThreshold}
      AND (
        status = 'queued'
        OR (status = 'in_progress' AND created_at < ${inProgressThreshold})
      )
    LIMIT 25
  `.catch(() => [])

  let recovered = 0
  for (const row of stale) {
    const job: InvestigationJob = {
      projectId: row.project_id,
      logId: row.log_id ?? undefined,
      clusterId: row.cluster_id ?? undefined,
      investigationId: row.id,
      attempt: 2,
    }
    await investigationQueue.add(job, { jobId: `recover-${row.id}` })
    recovered++
  }
  return recovered
}
