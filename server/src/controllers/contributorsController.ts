import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

export async function getContributors(req: AuthRequest, res: Response): Promise<void> {
  const { type, q } = req.query as { type?: string; q?: string };
  try {
    let query = `SELECT * FROM contributor WHERE created_by = $1`;
    const params: string[] = [req.userId!];
    if (type && ['COMPOSER', 'LYRICIST', 'BOTH'].includes(type)) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    if (q?.trim()) {
      params.push(`%${q.trim()}%`);
      query += ` AND LOWER(name) LIKE LOWER($${params.length})`;
    }
    query += ' ORDER BY name';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[contributors] getContributors:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function createContributor(req: AuthRequest, res: Response): Promise<void> {
  const { name, type = 'BOTH' } = req.body as { name?: string; type?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Имя обязательно' });
    return;
  }
  const validTypes = ['COMPOSER', 'LYRICIST', 'BOTH'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: 'Недопустимый тип' });
    return;
  }
  try {
    const existing = await db.query(
      'SELECT id FROM contributor WHERE LOWER(name) = LOWER($1) AND created_by = $2 AND type = $3',
      [name.trim(), req.userId, type]
    );
    if (existing.rows.length > 0) {
      res.json(existing.rows[0]);
      return;
    }
    const result = await db.query(
      `INSERT INTO contributor (name, type, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), type, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[contributors] createContributor:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function updateContributor(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, type } = req.body as { name?: string; type?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Имя обязательно' });
    return;
  }
  try {
    const result = await db.query(
      `UPDATE contributor SET name=$1, type=COALESCE($2,type)
       WHERE id=$3 AND created_by=$4 RETURNING *`,
      [name.trim(), type ?? null, id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Не найдено' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[contributors] updateContributor:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function deleteContributor(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await db.query(
      'DELETE FROM contributor WHERE id=$1 AND created_by=$2',
      [id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[contributors] deleteContributor:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
