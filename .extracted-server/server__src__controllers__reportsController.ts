import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// 1. Песни на гастролях заданной группы
export async function songsByBandTours(req: AuthRequest, res: Response): Promise<void> {
  const { bandId } = req.query as { bandId?: string };
  if (!bandId) { res.status(400).json({ error: 'bandId обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT DISTINCT s.title, s.composer, s.creation_year
       FROM song s
       JOIN tour_song ts ON ts.song_id = s.id
       JOIN tour t ON t.id = ts.tour_id
       WHERE t.band_id = $1
       ORDER BY s.title`,
      [bandId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] songsByBandTours:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// 2. Группы, исполняющие песни заданного композитора
export async function bandsByComposer(req: AuthRequest, res: Response): Promise<void> {
  const { composer } = req.query as { composer?: string };
  if (!composer) { res.status(400).json({ error: 'composer обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT DISTINCT b.name, b.country, b.rating
       FROM band b
       JOIN repertoire r ON r.band_id = b.id
       JOIN song s ON s.id = r.song_id
       WHERE LOWER(s.composer) LIKE LOWER($1)
       ORDER BY b.name`,
      [`%${composer}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] bandsByComposer:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// 3. Информация о песне по названию
export async function songInfo(req: AuthRequest, res: Response): Promise<void> {
  const { title } = req.query as { title?: string };
  if (!title) { res.status(400).json({ error: 'title обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT s.*, array_agg(DISTINCT b.name) FILTER (WHERE b.name IS NOT NULL) AS bands
       FROM song s
       LEFT JOIN repertoire r ON r.song_id = s.id
       LEFT JOIN band b ON b.id = r.band_id
       WHERE LOWER(s.title) LIKE LOWER($1)
       GROUP BY s.id
       ORDER BY s.title`,
      [`%${title}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] songInfo:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// 4. Репертуар наиболее популярной группы (по рейтингу)
export async function topBandRepertoire(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT s.title, s.composer, s.lyricist, s.creation_year, b.name AS band_name, b.rating
       FROM song s
       JOIN repertoire r ON r.song_id = s.id
       JOIN band b ON b.id = r.band_id
       WHERE b.id = (SELECT id FROM band WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 1)
       ORDER BY s.title`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] topBandRepertoire:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// 5. Место и даты гастролей группы
export async function toursByBand(req: AuthRequest, res: Response): Promise<void> {
  const { bandId } = req.query as { bandId?: string };
  if (!bandId) { res.status(400).json({ error: 'bandId обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT t.program_name, t.city, t.start_date, t.end_date, t.avg_ticket_price,
              b.name AS band_name
       FROM tour t
       JOIN band b ON b.id = t.band_id
       WHERE t.band_id = $1
       ORDER BY t.start_date DESC`,
      [bandId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] toursByBand:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// 6. Песни заданного исполнителя
export async function songsBySinger(req: AuthRequest, res: Response): Promise<void> {
  const { singerId } = req.query as { singerId?: string };
  if (!singerId) { res.status(400).json({ error: 'singerId обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT DISTINCT s.title, s.composer, s.creation_year, b.name AS band_name
       FROM song s
       JOIN repertoire r ON r.song_id = s.id
       JOIN band b ON b.id = r.band_id
       JOIN band_member bm ON bm.band_id = b.id
       WHERE bm.singer_id = $1
       ORDER BY s.title`,
      [singerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] songsBySinger:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
```

**Файл: