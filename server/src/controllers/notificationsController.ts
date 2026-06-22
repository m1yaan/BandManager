import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.userId]
    );
    const unreadCount = result.rows.filter((n: { is_read: boolean }) => !n.is_read).length;
    res.json({ notifications: result.rows, unreadCount });
  } catch (err) {
    console.error('[notifications] getNotifications:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function markRead(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await db.query(
      `UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`,
      [id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[notifications] markRead:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function markAllRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    await db.query(
      `UPDATE notifications SET is_read=true WHERE user_id=$1`,
      [req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[notifications] markAllRead:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
