import Queue from 'bull';
import Redis from 'redis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

let redisClient: Redis.RedisClient | null = null;

function getRedisClient(): Redis.RedisClient {
  if (!redisClient) {
    redisClient = Redis.createClient({
      url: REDIS_URL,
    });
    redisClient.on('error', (err) => console.error('[v0] Redis error:', err));
  }
  return redisClient;
}

export interface InvestigationJob {
  projectId: string;
  logId: string;
  clusterId: string;
  parentInvestigationId?: string;
  attempt?: number;
}

// Create investigation queue
export const investigationQueue = new Queue<InvestigationJob>(
  'investigations',
  REDIS_URL,
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    },
  }
);

export async function queueInvestigation(job: InvestigationJob): Promise<string> {
  try {
    const queued = await investigationQueue.add(job, {
      jobId: `inv-${job.logId}-${Date.now()}`,
    });
    return queued.id as string;
  } catch (error) {
    console.error('[v0] Failed to queue investigation:', error);
    throw error;
  }
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const counts = await investigationQueue.getJobCounts();
  return counts;
}

// Register investigation processor
export async function setupInvestigationProcessor(
  processor: (job: InvestigationJob) => Promise<void>
): Promise<void> {
  investigationQueue.process(async (job) => {
    console.log(`[v0] Processing investigation job: ${job.id}`);
    await processor(job.data);
    return { success: true };
  });

  investigationQueue.on('error', (error) => {
    console.error('[v0] Investigation queue error:', error);
  });

  investigationQueue.on('failed', (job, error) => {
    console.error(`[v0] Investigation job ${job.id} failed:`, error);
  });

  investigationQueue.on('completed', (job) => {
    console.log(`[v0] Investigation job ${job.id} completed`);
  });
}

export async function closeQueue(): Promise<void> {
  if (investigationQueue) {
    await investigationQueue.close();
  }
  if (redisClient) {
    await new Promise<void>((resolve) => {
      redisClient!.quit(() => resolve());
    });
  }
}
