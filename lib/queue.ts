import { getSql } from './db'

export interface InvestigationJob {
  projectId: string
  logId: string
  clusterId: string
  investigationId?: string
  parentInvestigationId?: string
  attempt?: number
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

export const queue = {
  async add(name: string, data: unknown) {
    return { id: `${name}-${Date.now()}`, data } as QueueJob<unknown>
  },
}

export const investigationQueue = {
  async add(data: InvestigationJob, options?: { jobId?: string }) {
    const job = { id: options?.jobId ?? `inv-${data.logId}-${Date.now()}`, data }
    pendingJobs.push(job)

    if (registeredProcessor) {
      // Best-effort inline processing. Never block or throw on failure so a
      // downed/inaccessible queue worker cannot take down log ingestion.
      void registeredProcessor(job.data).catch((error) => {
        console.error('[v0] Inline investigation processing error:', error)
      })
    }

    return job
  },
  async getJobCounts() {
    return { waiting: pendingJobs.length, active: 0, completed: 0, failed: 0 }
  },
  async process(processor: (job: InvestigationJob) => Promise<void>) {
    registeredProcessor = processor
    while (pendingJobs.length > 0) {
      const job = pendingJobs.shift()
      if (job) await processor(job.data)
    }
  },
  async close() {
    registeredProcessor = null
    pendingJobs.length = 0
  },
}

export async function queueInvestigation(job: InvestigationJob): Promise<QueueEnqueueResult> {
  let investigationId = job.investigationId

  try {
    if (!investigationId) {
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
          ${job.clusterId},
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

export async function setupInvestigationProcessor(
  processor: (job: InvestigationJob) => Promise<void>,
): Promise<void> {
  registeredProcessor = processor
}

export async function closeQueue(): Promise<void> {
  await investigationQueue.close()
}