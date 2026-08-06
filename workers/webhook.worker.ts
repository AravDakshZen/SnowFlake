import { deliverWebhook } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'

export async function processWebhookJob(job: { data: { webhookId: string; url: string; secret: string; event: string; data: unknown; projectId: string } }) {
  const { webhookId, url, secret, event, data, projectId } = job.data
  const payload = { event, timestamp: new Date().toISOString(), projectId, data }
  const success = await deliverWebhook(url, payload, secret)
  await logAudit(projectId, 'webhook_delivered', 'webhook', webhookId, { event, url, status: success ? 'success' : 'failed' })
  if (!success) throw new Error(`Failed to deliver webhook after retries: ${url}`)
  return { success: true }
}

export async function initializeWebhookWorker() {
  return { status: 'ready', runtime: 'vercel-compatible' as const }
}
