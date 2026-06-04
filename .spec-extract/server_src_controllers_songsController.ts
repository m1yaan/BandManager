import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/songs
export async function getSongs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query('SELECT * FROM song ORDER BY title');
    res.json(result.rows);
  } catch (err) {
    console.error('[songs] getSongs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/songs
export async function createSong(req: AuthRequest, res: Response): Promise<void> {
  const { title, composer, lyricist, creation_year } = req.body as {
    title?: string;
    composer?: string;
    lyricist?: string;
    creation_year?: number | null;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const result = await db.query(
      `INSERT INTO song (title, composer, lyricist, creation_year, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title.trim(), composer?.trim() ?? '', lyricist?.trim() ?? '', creation_year ?? null, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[songs] createSong error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/songs/:id
export async function updateSong(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, composer, lyricist, creation_year } = req.body as {
    title?: string;
    composer?: string;
    lyricist?: string;
    creation_year?: number | null;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const result = await db.query(
      `UPDATE song SET title=$1, composer=$2, lyricist=$3, creation_year=$4
       WHERE id=$5 AND created_by=$6 RETURNING *`,
      [title.trim(), composer?.trim() ?? '', lyricist?.trim() ?? '', creation_year ?? null, id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Song not found or permission denied' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[songs] updateSong error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /api/songs/:id
export async function deleteSong(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM song WHERE id = $1 AND created_by = $2',
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Song not found or permission denied' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[songs] deleteSong error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}