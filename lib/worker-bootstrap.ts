import { setupInvestigationProcessor, recoverStaleInvestigations } from './queue'
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
let lastRecoveryAt = 0
const RECOVERY_INTERVAL_MS = 60_000

export function ensureWorkerRegistered(): void {
  if (!bootstrapped) {
    bootstrapped = true
    void setupInvestigationProcessor(processInvestigation).catch((error) => {
      console.error('[v0] Worker registration failed:', error)
    })
  }
  // Every warm request path also sweeps for stale investigations, throttled
  // to at most once per minute per lambda instance.
  runStaleRecoverySweep()
}

/**
 * Periodically sweeps the database for investigations left stuck in
 * 'queued' / 'in_progress' by a frozen serverless lambda, and re-enqueues
 * them. Call from any warm path (e.g. route handlers) — it self-throttles
 * so it only hits the DB at most once per minute per instance.
 */
export function runStaleRecoverySweep(): void {
  const now = Date.now()
  if (now - lastRecoveryAt < RECOVERY_INTERVAL_MS) return
  lastRecoveryAt = now
  void recoverStaleInvestigations()
    .then((count) => {
      if (count > 0) {
        console.error(`[v0] Recovery sweep re-enqueued ${count} stale investigation(s)`)
      }
    })
    .catch(() => {})
}
