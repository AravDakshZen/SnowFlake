import { prisma } from './db'

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
  | 'api_key_regenerated'
  | 'alert_config_updated'
  | 'webhook_delivered'

export async function logAudit(
  projectId: string,
  action: AuditAction,
  entityType?: string,
  entityId?: string,
  metadata?: any,
  userId?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        projectId,
        action,
        entityType,
        entityId,
        metadata,
        userId,
      },
    })
  } catch (error) {
    console.error('[v0] Audit log error:', error)
  }
}

export async function getAuditLogs(
  projectId: string,
  filters?: {
    action?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }
) {
  const limit = filters?.limit || 50
  const offset = filters?.offset || 0

  const where: any = { projectId }

  if (filters?.action) {
    where.action = filters.action
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {}
    if (filters?.dateFrom) where.createdAt.gte = filters.dateFrom
    if (filters?.dateTo) where.createdAt.lte = filters.dateTo
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total, hasMore: offset + limit < total }
}
