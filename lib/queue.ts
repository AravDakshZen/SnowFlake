export interface InvestigationJob {
  projectId: string
  logId: string
  clusterId: string
  parentInvestigationId?: string
  attempt?: number
}

export interface QueueJob<T> {
  id: string
  data: T
}

const pendingJobs: QueueJob<InvestigationJob>[] = []

export const queue = {
  async add(name: string, data: unknown) {
    const job = { id: `${name}-${Date.now()}`, data } as QueueJob<unknown>
    return job
  },
}

export const investigationQueue = {
  async add(data: InvestigationJob, options?: { jobId?: string }) {
    const job = { id: options?.jobId ?? `inv-${data.logId}-${Date.now()}`, data }
    pendingJobs.push(job)
    return job
  },
  async getJobCounts() {
    return { waiting: pendingJobs.length, active: 0, completed: 0, failed: 0 }
  },
  async close() {
    pendingJobs.length = 0
  },
  process() {
    return undefined
  },
  on() {
    return undefined
  },
}

export async function queueInvestigation(job: InvestigationJob): Promise<string> {
  const queued = await investigationQueue.add(job, { jobId: `inv-${job.logId}-${Date.now()}` })
  return queued.id
}

export async function getQueueStats() {
  return investigationQueue.getJobCounts()
}

export async function setupInvestigationProcessor(
  _processor: (job: InvestigationJob) => Promise<void>,
): Promise<void> {
  // Vercel-compatible fallback: production processing is triggered by a worker deployment.
}

export async function closeQueue(): Promise<void> {
  await investigationQueue.close()
}
