import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';

const ALLOWED_ENTITY_TYPES = new Set([
  'band', 'singer', 'song', 'tour', 'tour_stop', 'rider_checklist', 'message',
]);
const ALLOWED_ACTIONS = new Set(['CREATE', 'UPDATE', 'DELETE']);

export async function getAuditLog(req: AuthRequest, res: Response): Promise<void> {
  const {
    userId,
    entityType,
    action,
    from,
    to,
    page = '1',
    limit = '20',
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let idx = 1;

  if (userId) {
    conditions.push(`a.user_id = $${idx++}`);
    params.push(userId);
  }
  if (entityType) {
    if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
      res.status(400).json({ error: 'Недопустимый тип сущности' });
      return;
    }
    conditions.push(`a.entity_type = $${idx++}`);
    params.push(entityType);
  }
  if (action) {
    if (!ALLOWED_ACTIONS.has(action)) {
      res.status(400).json({ error: 'Недопустимое действие' });
      return;
    }
    conditions.push(`a.action = $${idx++}`);
    params.push(action);
  }
  if (from) {
    conditions.push(`a.created_at >= $${idx++}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`a.created_at <= $${idx++}`);
    params.push(to);
  }

  const where = conditions.join(' AND ');

  try {
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM audit_log a WHERE ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const result = await db.query(
      `SELECT a.id, a.user_id, u.email AS user_email, a.action, a.entity_type,
              a.entity_id, a.old_values, a.new_values, a.ip_address, a.user_agent, a.created_at
       FROM audit_log a
       JOIN users u ON u.id = a.user_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limitNum, offset],
    );

    res.json({
      items: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error('[audit] getAuditLog error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
