import { getSql } from './db'

export type AuditAction =
  | 'log_ingested'
  | 'investigation_queued'
  | 'investigation_complete'
  | 'pr_created'
  | 'pr_merged'
  | 'reinvestigation_triggered'
  | 'escalation_fired'
  | 'llm_key_updated'
  | 'repo_connected'
  | 'github_disconnected'
  | 'api_key_regenerated'
  | 'alert_config_updated'
  | 'webhook_delivered'

export async function logAudit(
  projectId: string,
  action: AuditAction,
  entityType?: string,
  entityId?: string,
  metadata?: unknown,
  userId?: string,
) {
  try {
    const sql = getSql()
    await sql`
      INSERT INTO public.audit_logs (project_id, user_id, action, entity_type, entity_id, metadata)
      VALUES (${projectId}, ${userId ?? null}, ${action}, ${entityType ?? null}, ${entityId ?? null}, ${metadata ? sql.json(JSON.parse(JSON.stringify(metadata))) : null})
    `
  } catch (error) {
    console.error('[v0] Audit log error:', error)
  }
}

export async function getAuditLogs(projectId: string, filters?: {
  action?: string
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}) {
  const sql = getSql()
  const limit = Math.min(filters?.limit ?? 50, 100)
  const offset = filters?.offset ?? 0
  const rows = await sql`
    SELECT id, project_id, user_id, action, entity_type, entity_id, metadata, created_at
    FROM public.audit_logs
    WHERE project_id = ${projectId}
      AND (${filters?.action ?? null} IS NULL OR action = ${filters?.action ?? null})
      AND (${filters?.dateFrom ?? null} IS NULL OR created_at >= ${filters?.dateFrom ?? null})
      AND (${filters?.dateTo ?? null} IS NULL OR created_at <= ${filters?.dateTo ?? null})
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM public.audit_logs WHERE project_id = ${projectId}
  `
  return { logs: rows, total: count, hasMore: offset + limit < count }
}
