import { Request } from 'express';
import { db } from '../db/pool';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type EntityType =
  | 'band'
  | 'singer'
  | 'song'
  | 'tour'
  | 'tour_stop'
  | 'rider_checklist'
  | 'message';

export function getAuditContext(req: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipFromForwarded = typeof forwarded === 'string'
    ? forwarded.split(',')[0]?.trim()
    : Array.isArray(forwarded)
      ? forwarded[0]
      : null;

  return {
    ip: ipFromForwarded || req.ip || req.socket.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
  };
}

export function logAction(
  userId: string,
  action: AuditAction,
  entityType: EntityType,
  entityId: string | null | undefined,
  oldValues?: unknown,
  newValues?: unknown,
  context?: { ip?: string | null; userAgent?: string | null },
): void {
  const { ip = null, userAgent = null } = context ?? {};

  void db.query(
    `INSERT INTO audit_log
       (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      action,
      entityType,
      entityId ?? null,
      oldValues ?? null,
      newValues ?? null,
      ip,
      userAgent,
    ],
  ).catch(err => console.error('[audit] logAction error:', err));
}
