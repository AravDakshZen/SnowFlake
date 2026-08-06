import crypto from 'crypto'
import { getSql } from './db'
import { queue } from './queue'

export async function triggerWebhook(projectId: string, event: string, data: unknown) {
  try {
    const sql = getSql()
    const webhooks = await sql`
      SELECT id, url, secret, events FROM public.outbound_webhooks
      WHERE project_id = ${projectId} AND ${event} = ANY(events)
    `
    for (const webhook of webhooks) {
      await queue.add('webhook_delivery', { webhookId: webhook.id, url: webhook.url, secret: webhook.secret, event, data, projectId })
    }
  } catch (error) {
    console.error('[v0] Error triggering webhooks:', error)
  }
}

export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export async function deliverWebhook(url: string, payload: unknown, secret: string, attempt = 1): Promise<boolean> {
  const payloadStr = JSON.stringify(payload)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tracewise-Signature': signWebhookPayload(payloadStr, secret), 'X-Tracewise-Timestamp': Date.now().toString() },
      body: payloadStr,
    })
    if (response.ok) return true
  } catch (error) {
    console.error(`[v0] Webhook delivery failed (attempt ${attempt}):`, error)
  }
  if (attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000))
    return deliverWebhook(url, payload, secret, attempt + 1)
  }
  return false
}

export async function getWebhooks(projectId: string) {
  const sql = getSql()
  return sql`SELECT * FROM public.outbound_webhooks WHERE project_id = ${projectId} ORDER BY created_at DESC`
}
