import crypto from 'crypto'
import { prisma } from './db'
import { queue } from './queue'

export async function triggerWebhook(
  projectId: string,
  event: string,
  data: any
) {
  try {
    const webhooks = await prisma.outboundWebhook.findMany({
      where: {
        projectId,
        events: { has: event },
      },
    })

    for (const webhook of webhooks) {
      await queue.add('webhook_delivery', {
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        event,
        data,
        projectId,
      })
    }
  } catch (error) {
    console.error('[v0] Error triggering webhooks:', error)
  }
}

export function signWebhookPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

export async function deliverWebhook(
  url: string,
  payload: any,
  secret: string,
  attempt = 1
) {
  const payloadStr = JSON.stringify(payload)
  const signature = signWebhookPayload(payloadStr, secret)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Snowflake-Signature': signature,
        'X-Snowflake-Timestamp': Date.now().toString(),
      },
      body: payloadStr,
    })

    return response.ok
  } catch (error) {
    console.error(`[v0] Webhook delivery failed (attempt ${attempt}):`, error)
    if (attempt < 3) {
      // Exponential backoff retry
      const delayMs = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return deliverWebhook(url, payload, secret, attempt + 1)
    }
    return false
  }
}

export async function getWebhooks(projectId: string) {
  return await prisma.outboundWebhook.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
}
