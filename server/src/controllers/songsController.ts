import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/songs — только свои
export async function getSongs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      'SELECT * FROM song WHERE created_by = $1 ORDER BY title',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[songs] getSongs error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/songs/:id/singers — исполнители песни
export async function getSongSingers(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT s.* FROM singer s
       JOIN song_singer ss ON ss.singer_id = s.id
       WHERE ss.song_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[songs] getSongSingers error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/songs/:id/bands — группы которые исполняют песню
export async function getSongBands(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT b.* FROM band b
       JOIN repertoire r ON r.band_id = b.id
       WHERE r.song_id = $1 AND b.created_by = $2`,
      [id, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[songs] getSongBands error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/songs/:id/singers — привязать исполнителя
export async function addSongSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { singerId } = req.body as { singerId?: string };
  if (!singerId) {
    res.status(400).json({ error: 'singerId обязателен' });
    return;
  }
  try {
    await db.query(
      `INSERT INTO song_singer (song_id, singer_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, singerId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[songs] addSongSinger error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// DELETE /api/songs/:id/singers/:singerId — отвязать исполнителя
export async function removeSongSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id, singerId } = req.params;
  try {
    await db.query(
      'DELETE FROM song_singer WHERE song_id=$1 AND singer_id=$2',
      [id, singerId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[songs] removeSongSinger error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/songs
export async function createSong(req: AuthRequest, res: Response): Promise<void> {
  const { title, composer, lyricist, creation_year } = req.body as {
    title?: string; composer?: string; lyricist?: string; creation_year?: number | null;
  };
  if (!title?.trim()) {
    res.status(400).json({ error: 'Название обязательно' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// PUT /api/songs/:id
export async function updateSong(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, composer, lyricist, creation_year } = req.body as {
    title?: string; composer?: string; lyricist?: string; creation_year?: number | null;
  };
  if (!title?.trim()) {
    res.status(400).json({ error: 'Название обязательно' });
    return;
  }
  try {
    const result = await db.query(
      `UPDATE song SET title=$1, composer=$2, lyricist=$3, creation_year=$4
       WHERE id=$5 AND created_by=$6 RETURNING *`,
      [title.trim(), composer?.trim() ?? '', lyricist?.trim() ?? '', creation_year ?? null, id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Песня не найдена или нет доступа' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[songs] updateSong error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// DELETE /api/songs/:id
export async function deleteSong(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM song WHERE id=$1 AND created_by=$2',
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Песня не найдена или нет доступа' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[songs] deleteSong error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
