import { Queue } from 'bull'
import { deliverWebhook } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'

let webhookQueue: Queue

export function getWebhookQueue(): Queue {
  if (!webhookQueue) {
    webhookQueue = new Queue('webhooks', process.env.REDIS_URL || 'redis://localhost:6379')
  }
  return webhookQueue
}

export async function initializeWebhookWorker() {
  const queue = getWebhookQueue()

  queue.process(async (job) => {
    const { webhookId, url, secret, event, data, projectId } = job.data

    console.log(`[v0] Processing webhook: ${event} to ${url}`)

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      projectId,
      data,
    }

    const success = await deliverWebhook(url, payload, secret)

    if (success) {
      await logAudit(
        projectId,
        'webhook_delivered',
        'webhook',
        webhookId,
        { event, url, status: 'success' }
      )
      console.log(`[v0] Webhook delivered successfully: ${event}`)
    } else {
      await logAudit(
        projectId,
        'webhook_delivered',
        'webhook',
        webhookId,
        { event, url, status: 'failed' }
      )
      throw new Error(`Failed to deliver webhook after retries: ${url}`)
    }
  })

  queue.on('completed', (job) => {
    console.log(`[v0] Webhook job completed: ${job.id}`)
  })

  queue.on('failed', (job, err) => {
    console.error(`[v0] Webhook job failed: ${job.id}`, err)
  })

  console.log('[v0] Webhook worker initialized')
}
