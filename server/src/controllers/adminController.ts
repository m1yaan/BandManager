import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';

// GET /api/admin/users
export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT id, email, name, avatar_url, role, is_blocked, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[admin] getUsers:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/admin/users/:id
export async function getUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT id, email, name, avatar_url, role, is_blocked, created_at FROM users WHERE id = $1`,
      [id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Пользователь не найден' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[admin] getUser:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// PUT /api/admin/users/:id — изменить роль
export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { role } = req.body as { role?: string };

  if (id === req.userId && role !== 'admin') {
    res.status(400).json({ error: 'Нельзя снять роль ADMIN у самого себя' });
    return;
  }

  const validRoles = ['manager', 'artist', 'admin'];
  if (!role || !validRoles.includes(role)) {
    res.status(400).json({ error: 'Недопустимая роль' });
    return;
  }

  try {
    const result = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, is_blocked, created_at`,
      [role, id]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Пользователь не найден' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[admin] updateUser:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/admin/users/:id/block
export async function blockUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (id === req.userId) {
    res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
    return;
  }
  try {
    const result = await db.query(
      `UPDATE users SET is_blocked = true WHERE id = $1 RETURNING id, email, name, role, is_blocked`,
      [id]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Пользователь не найден' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[admin] blockUser:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/admin/users/:id/unblock
export async function unblockUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE users SET is_blocked = false WHERE id = $1 RETURNING id, email, name, role, is_blocked`,
      [id]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Пользователь не найден' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[admin] unblockUser:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// DELETE /api/admin/users/:id
export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (id === req.userId) {
    res.status(400).json({ error: 'Нельзя удалить самого себя' });
    return;
  }
  try {
    const result = await db.query(`DELETE FROM users WHERE id = $1`, [id]);
    if (result.rowCount === 0) { res.status(404).json({ error: 'Пользователь не найден' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('[admin] deleteUser:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/admin/users/:id/bands
export async function getUserBands(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM band WHERE created_by=$1 ORDER BY name', [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[admin] getUserBands:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/admin/users/:id/singers
export async function getUserSingers(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM singer WHERE created_by=$1 ORDER BY name', [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[admin] getUserSingers:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/admin/users/:id/songs
export async function getUserSongs(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM song WHERE created_by=$1 ORDER BY title', [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[admin] getUserSongs:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/admin/users/:id/tours
export async function getUserTours(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT t.*, row_to_json(b.*) AS band, row_to_json(s.*) AS singer_data
       FROM tour t
       LEFT JOIN band b ON b.id = t.band_id
       LEFT JOIN singer s ON s.id = t.singer_id
       WHERE t.created_by=$1
       ORDER BY t.start_date DESC NULLS LAST`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[admin] getUserTours:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/admin/users/:id/messages
export async function getUserMessages(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT m.*, b.name AS band_name, s.name AS singer_name
       FROM messages m
       LEFT JOIN band b ON b.id = m.band_id
       LEFT JOIN singer s ON s.id = m.singer_id
       WHERE m.user_id=$1
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[admin] getUserMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/admin/stats
export async function getAdminStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [users, tickets, messages] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_blocked) AS blocked FROM users`),
      db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open FROM support_tickets`),
      db.query(`SELECT COUNT(*) AS total FROM messages WHERE status = 'new'`),
    ]);
    res.json({
      users:   { total: parseInt(users.rows[0].total), blocked: parseInt(users.rows[0].blocked) },
      tickets: { total: parseInt(tickets.rows[0].total), open: parseInt(tickets.rows[0].open) },
      messages: { unread: parseInt(messages.rows[0].total) },
    });
  } catch (err) {
    console.error('[admin] getAdminStats:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
