import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';
import { ownershipFilter } from '../db/ownership';

export async function songsByBandTours(req: AuthRequest, res: Response): Promise<void> {
  const { bandId } = req.query as { bandId?: string };
  if (!bandId) { res.status(400).json({ error: 'bandId обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT DISTINCT s.title,
              c.name AS composer_name,
              s.release_date
       FROM song s
       JOIN tour_song ts ON ts.song_id = s.id
       JOIN tour t ON t.id = ts.tour_id
       LEFT JOIN contributor c ON c.id = s.composer_id
       WHERE t.band_id = $1 AND ${ownershipFilter('t', '$2')}
       ORDER BY s.title`,
      [bandId, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] songsByBandTours:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function bandsByComposer(req: AuthRequest, res: Response): Promise<void> {
  const { composer } = req.query as { composer?: string };
  if (!composer) { res.status(400).json({ error: 'composer обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT DISTINCT b.name, b.country, b.rating
       FROM band b
       WHERE ${ownershipFilter('b', '$2')}
         AND EXISTS (
           SELECT 1 FROM song s
           LEFT JOIN contributor c ON c.id = s.composer_id
           WHERE ${ownershipFilter('s', '$2')}
             AND LOWER(COALESCE(c.name, '')) LIKE LOWER($1)
             AND (
               EXISTS (SELECT 1 FROM song_band sb WHERE sb.band_id = b.id AND sb.song_id = s.id)
               OR EXISTS (SELECT 1 FROM repertoire r WHERE r.band_id = b.id AND r.song_id = s.id)
             )
         )
       ORDER BY b.name`,
      [`%${composer}%`, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] bandsByComposer:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function songInfo(req: AuthRequest, res: Response): Promise<void> {
  const { title } = req.query as { title?: string };
  if (!title) { res.status(400).json({ error: 'title обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT s.title,
              c1.name AS composer_name,
              c2.name AS lyricist_name,
              s.release_date,
              (
                SELECT COALESCE(array_agg(DISTINCT nm), '{}')
                FROM (
                  SELECT b.name AS nm
                  FROM band b
                  JOIN song_band sb ON sb.band_id = b.id
                  WHERE sb.song_id = s.id AND ${ownershipFilter('b', '$2')}
                  UNION
                  SELECT b.name
                  FROM band b
                  JOIN repertoire r ON r.band_id = b.id
                  WHERE r.song_id = s.id AND ${ownershipFilter('b', '$2')}
                ) bands_union
              ) AS bands
       FROM song s
       LEFT JOIN contributor c1 ON c1.id = s.composer_id
       LEFT JOIN contributor c2 ON c2.id = s.lyricist_id
       WHERE LOWER(s.title) LIKE LOWER($1)
         AND ${ownershipFilter('s', '$2')}
       ORDER BY s.title`,
      [`%${title}%`, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] songInfo:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function topBandRepertoire(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `WITH top_band AS (
         SELECT id FROM band
         WHERE rating IS NOT NULL AND ${ownershipFilter(undefined, '$1')}
         ORDER BY rating DESC NULLS LAST
         LIMIT 1
       )
       SELECT s.title,
              c1.name AS composer_name,
              c2.name AS lyricist_name,
              s.release_date,
              b.name AS band_name,
              b.rating
       FROM top_band tb
       JOIN band b ON b.id = tb.id
       JOIN (
         SELECT song_id, band_id FROM song_band
         UNION
         SELECT song_id, band_id FROM repertoire
       ) links ON links.band_id = b.id
       JOIN song s ON s.id = links.song_id AND ${ownershipFilter('s', '$1')}
       LEFT JOIN contributor c1 ON c1.id = s.composer_id
       LEFT JOIN contributor c2 ON c2.id = s.lyricist_id
       ORDER BY s.title`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] topBandRepertoire:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function toursByBand(req: AuthRequest, res: Response): Promise<void> {
  const { bandId } = req.query as { bandId?: string };
  if (!bandId) { res.status(400).json({ error: 'bandId обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT t.program_name, t.city,
              TO_CHAR(t.start_date, 'YYYY-MM-DD') AS start_date,
              TO_CHAR(t.end_date, 'YYYY-MM-DD') AS end_date,
              t.avg_ticket_price,
              b.name AS band_name
       FROM tour t
       JOIN band b ON b.id = t.band_id
       WHERE t.band_id = $1 AND ${ownershipFilter('t', '$2')}
       ORDER BY t.start_date DESC`,
      [bandId, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] toursByBand:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function songsBySinger(req: AuthRequest, res: Response): Promise<void> {
  const { singerId } = req.query as { singerId?: string };
  if (!singerId) { res.status(400).json({ error: 'singerId обязателен' }); return; }
  try {
    const result = await db.query(
      `SELECT DISTINCT s.title,
              c.name AS composer_name,
              s.release_date
       FROM song s
       JOIN song_singer ss ON ss.song_id = s.id
       LEFT JOIN contributor c ON c.id = s.composer_id
       WHERE ss.singer_id = $1 AND ${ownershipFilter('s', '$2')}
       ORDER BY s.title`,
      [singerId, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[reports] songsBySinger:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
