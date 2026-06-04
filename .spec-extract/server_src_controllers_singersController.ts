import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/singers
export async function getSingers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query('SELECT * FROM singer ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('[singers] getSingers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/singers
export async function createSinger(req: AuthRequest, res: Response): Promise<void> {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const result = await db.query(
      'INSERT INTO singer (name, created_by) VALUES ($1, $2) RETURNING *',
      [name.trim(), req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[singers] createSinger error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/singers/:id
export async function updateSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const result = await db.query(
      'UPDATE singer SET name = $1 WHERE id = $2 AND created_by = $3 RETURNING *',
      [name.trim(), id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Singer not found or permission denied' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[singers] updateSinger error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /api/singers/:id
export async function deleteSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM singer WHERE id = $1 AND created_by = $2',
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Singer not found or permission denied' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[singers] deleteSinger error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}