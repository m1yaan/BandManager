import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/support — свои тикеты (admin видит все)
export async function getTickets(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.query as { status?: string };
  const isAdmin = req.userRole === 'admin';

  let query: string;
  let params: (string | null)[];

  if (isAdmin) {
    query = `
      SELECT st.*, u.email AS user_email, u.name AS user_name
      FROM support_tickets st
      JOIN users u ON u.id = st.user_id
      ${status && status !== 'all' ? 'WHERE st.status = $1' : ''}
      ORDER BY st.created_at DESC
    `;
    params = status && status !== 'all' ? [status] : [];
  } else {
    query = `
      SELECT * FROM support_tickets
      WHERE user_id = $1 ${status && status !== 'all' ? 'AND status = $2' : ''}
      ORDER BY created_at DESC
    `;
    params = status && status !== 'all' ? [req.userId!, status] : [req.userId!];
  }

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[support] getTickets:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/support/:id
export async function getTicket(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const isAdmin = req.userRole === 'admin';
  try {
    const result = await db.query(
      `SELECT st.*, u.email AS user_email, u.name AS user_name
       FROM support_tickets st
       JOIN users u ON u.id = st.user_id
       WHERE st.id = $1 ${isAdmin ? '' : 'AND st.user_id = $2'}`,
      isAdmin ? [id] : [id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Тикет не найден' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[support] getTicket:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/support
export async function createTicket(req: AuthRequest, res: Response): Promise<void> {
  const { subject, message, file_url } = req.body as {
    subject?: string; message?: string; file_url?: string;
  };
  if (!subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'Тема и сообщение обязательны' });
    return;
  }
  try {
    const result = await db.query(
      `INSERT INTO support_tickets (user_id, subject, message, file_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, subject.trim(), message.trim(), file_url?.trim() ?? '']
    );

    const admins = await db.query(`SELECT id FROM users WHERE role = 'admin'`);
    for (const admin of admins.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, $2, $3, 'info', '/support')`,
        [admin.id, 'Новый тикет поддержки', `${subject.trim()}`]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[support] createTicket:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// PATCH /api/support/:id — только admin меняет статус
export async function updateTicket(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, admin_note } = req.body as { status?: string; admin_note?: string };
  const isAdmin = req.userRole === 'admin';

  if (!isAdmin) {
    res.status(403).json({ error: 'Только администратор может менять статус' });
    return;
  }

  const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Недопустимый статус' });
    return;
  }

  try {
    const result = await db.query(
      `UPDATE support_tickets SET
         status = COALESCE($1, status),
         admin_note = COALESCE($2, admin_note),
         updated_at = now()
       WHERE id = $3 RETURNING *`,
      [status ?? null, admin_note ?? null, id]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Тикет не найден' }); return; }

    const ticket = result.rows[0];
    const statusLabels: Record<string, string> = {
      open: 'Открыт', in_progress: 'В работе', resolved: 'Решён', closed: 'Закрыт',
    };
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, 'info', '/support')`,
      [ticket.user_id, 'Статус тикета обновлён',
       `Тикет «${ticket.subject}» — ${statusLabels[ticket.status] ?? ticket.status}`]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[support] updateTicket:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
