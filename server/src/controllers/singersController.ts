import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';
import { logAction, getAuditContext } from '../middleware/auditMiddleware';

// GET /api/singers
export async function getSingers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT s.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name))
          FILTER (WHERE b.id IS NOT NULL), '[]'
        ) AS bands
       FROM singer s
       LEFT JOIN band_member bm ON bm.singer_id = s.id
       LEFT JOIN band b ON b.id = bm.band_id AND b.created_by = $1
       WHERE s.created_by = $1
       GROUP BY s.id
       ORDER BY s.name`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[singers] getSingers error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/singers/:id — детальная страница (Задача 4)
export async function getSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const singerResult = await db.query(
      `SELECT s.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name, 'rating', b.rating, 'country', b.country))
          FILTER (WHERE b.id IS NOT NULL), '[]'
        ) AS bands,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', so.id, 'title', so.title,
            'release_date', so.release_date,
            'composer_id', so.composer_id
          ))
          FILTER (WHERE so.id IS NOT NULL), '[]'
        ) AS songs
       FROM singer s
       LEFT JOIN band_member bm ON bm.singer_id = s.id
       LEFT JOIN band b ON b.id = bm.band_id
       LEFT JOIN song_singer ss ON ss.singer_id = s.id
       LEFT JOIN song so ON so.id = ss.song_id
       WHERE s.id = $1 AND s.created_by = $2
       GROUP BY s.id`,
      [id, req.userId]
    );
    if (!singerResult.rows[0]) {
      res.status(404).json({ error: 'Исполнитель не найден' });
      return;
    }

    const toursResult = await db.query(
      `SELECT t.*, row_to_json(b.*) AS band
       FROM tour t
       LEFT JOIN band b ON b.id = t.band_id
       WHERE t.created_by = $1
         AND (t.singer_id = $2
              OR t.band_id IN (
                SELECT bm.band_id FROM band_member bm WHERE bm.singer_id = $2
              ))
       ORDER BY t.start_date DESC NULLS LAST`,
      [req.userId, id]
    );

    const singer = singerResult.rows[0];
    const songCount = Array.isArray(singer.songs) ? singer.songs.length : 0;
    const bandCount = Array.isArray(singer.bands) ? singer.bands.length : 0;
    const tourCount = toursResult.rows.length;

    res.json({ ...singer, tours: toursResult.rows, songCount, bandCount, tourCount });
  } catch (err) {
    console.error('[singers] getSinger error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/singers/:id/bands
export async function getSingerBands(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT b.* FROM band b
       JOIN band_member bm ON bm.band_id = b.id
       WHERE bm.singer_id = $1 AND b.created_by = $2`,
      [id, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[singers] getSingerBands error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/singers/:id/songs
export async function getSingerSongs(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT DISTINCT so.* FROM song so
       JOIN song_singer ss ON ss.song_id = so.id
       WHERE ss.singer_id = $1 AND so.created_by = $2
       ORDER BY so.title`,
      [id, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[singers] getSingerSongs error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/singers
export async function createSinger(req: AuthRequest, res: Response): Promise<void> {
  const { name, country, rating, bio, bandIds } = req.body as {
    name?: string; country?: string; rating?: number | null;
    bio?: string; bandIds?: string[];
  };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Имя обязательно' });
    return;
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO singer (name, country, rating, bio, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), country?.trim() ?? '', rating ?? null, bio?.trim() ?? '', req.userId]
    );
    const singer = result.rows[0];
    if (bandIds?.length) {
      await client.query(
        `INSERT INTO band_member (band_id, singer_id)
         SELECT UNNEST($1::uuid[]), $2 ON CONFLICT DO NOTHING`,
        [bandIds, singer.id]
      );
    }
    await client.query('COMMIT');
    logAction(req.userId!, 'CREATE', 'singer', singer.id, null, req.body, getAuditContext(req));
    res.status(201).json(singer);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[singers] createSinger error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
}

// PUT /api/singers/:id
export async function updateSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, country, rating, bio, bandIds } = req.body as {
    name?: string; country?: string; rating?: number | null;
    bio?: string; bandIds?: string[];
  };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Имя обязательно' });
    return;
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const oldResult = await client.query(
      'SELECT * FROM singer WHERE id=$1 AND created_by=$2',
      [id, req.userId]
    );
    if (oldResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Исполнитель не найден или нет доступа' });
      return;
    }
    const result = await client.query(
      `UPDATE singer SET name=$1, country=$2, rating=$3, bio=$4
       WHERE id=$5 AND created_by=$6 RETURNING *`,
      [name.trim(), country?.trim() ?? '', rating ?? null, bio?.trim() ?? '', id, req.userId]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Исполнитель не найден или нет доступа' });
      return;
    }
    if (bandIds !== undefined) {
      await client.query('DELETE FROM band_member WHERE singer_id=$1', [id]);
      if (bandIds.length > 0) {
        await client.query(
          `INSERT INTO band_member (band_id, singer_id)
           SELECT UNNEST($1::uuid[]), $2 ON CONFLICT DO NOTHING`,
          [bandIds, id]
        );
      }
    }
    await client.query('COMMIT');
    logAction(req.userId!, 'UPDATE', 'singer', id, oldResult.rows[0], req.body, getAuditContext(req));
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[singers] updateSinger error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
}

// DELETE /api/singers/:id
export async function deleteSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const oldResult = await db.query(
      'SELECT * FROM singer WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (oldResult.rowCount === 0) {
      res.status(404).json({ error: 'Исполнитель не найден или нет доступа' });
      return;
    }
    await db.query('DELETE FROM singer WHERE id=$1 AND created_by=$2', [id, req.userId]);
    logAction(req.userId!, 'DELETE', 'singer', id, oldResult.rows[0], null, getAuditContext(req));
    res.json({ success: true });
  } catch (err) {
    console.error('[singers] deleteSinger error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
