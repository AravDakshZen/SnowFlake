import { setupInvestigationProcessor } from './queue'
import { processInvestigation } from '@/workers/investigation.worker'

/**
 * Wires the investigation processor into the in-memory queue so that jobs
 * enqueued by log ingestion / webhooks are actually processed within the
 * Next.js runtime. Safe to call multiple times - setup is idempotent.
 *
 * Import this module from any API route that enqueues investigation jobs
 * (e.g. the logs ingestion route and the GitHub webhook route).
 */
let bootstrapped = false

export function ensureWorkerRegistered(): void {
  if (bootstrapped) return
  bootstrapped = true
  void setupInvestigationProcessor(processInvestigation).catch((error) => {
    console.error('[v0] Worker registration failed:', error)
  })
}
