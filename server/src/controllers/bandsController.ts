import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/bands — только свои данные
export async function getBands(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      'SELECT * FROM band WHERE created_by = $1 ORDER BY name',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[bands] getBands error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/bands/stats — только свои данные
export async function getBandStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [bandCount, singerCount, songCount, tourCount, topBands] = await Promise.all([
      db.query('SELECT COUNT(*) FROM band WHERE created_by = $1', [req.userId]),
      db.query('SELECT COUNT(*) FROM singer WHERE created_by = $1', [req.userId]),
      db.query('SELECT COUNT(*) FROM song WHERE created_by = $1', [req.userId]),
      db.query('SELECT COUNT(*) FROM tour WHERE created_by = $1', [req.userId]),
      db.query(
        `SELECT name, rating, country FROM band
         WHERE created_by = $1 AND rating IS NOT NULL
         ORDER BY rating DESC LIMIT 5`,
        [req.userId]
      ),
    ]);

    res.json({
      bands:    parseInt(bandCount.rows[0].count),
      singers:  parseInt(singerCount.rows[0].count),
      songs:    parseInt(songCount.rows[0].count),
      tours:    parseInt(tourCount.rows[0].count),
      topBands: topBands.rows,
    });
  } catch (err) {
    console.error('[bands] getBandStats error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/bands/:id/details — проверяем владельца
export async function getBandDetails(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    // Проверяем доступ
    const access = await db.query(
      'SELECT id FROM band WHERE id = $1 AND created_by = $2',
      [id, req.userId]
    );
    if (access.rowCount === 0) {
      res.status(404).json({ error: 'Группа не найдена' });
      return;
    }

    const [members, repertoire] = await Promise.all([
      db.query(
        `SELECT s.* FROM singer s
         JOIN band_member bm ON bm.singer_id = s.id
         WHERE bm.band_id = $1`,
        [id]
      ),
      db.query(
        `SELECT so.* FROM song so
         JOIN repertoire r ON r.song_id = so.id
         WHERE r.band_id = $1`,
        [id]
      ),
    ]);
    res.json({ members: members.rows, repertoire: repertoire.rows });
  } catch (err) {
    console.error('[bands] getBandDetails error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/bands
export async function createBand(req: AuthRequest, res: Response): Promise<void> {
  const { name, foundation_year, country, rating, memberIds, songIds } = req.body as {
    name: string;
    foundation_year?: number | null;
    country?: string;
    rating?: number | null;
    memberIds?: string[];
    songIds?: string[];
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'Название обязательно' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO band (name, foundation_year, country, rating, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), foundation_year ?? null, country?.trim() ?? '', rating ?? null, req.userId]
    );
    const band = result.rows[0];

    if (memberIds?.length) {
      await client.query(
        `INSERT INTO band_member (band_id, singer_id) SELECT $1, UNNEST($2::uuid[])`,
        [band.id, memberIds]
      );
    }
    if (songIds?.length) {
      await client.query(
        `INSERT INTO repertoire (band_id, song_id) SELECT $1, UNNEST($2::uuid[])`,
        [band.id, songIds]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(band);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[bands] createBand error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
}

// PUT /api/bands/:id
export async function updateBand(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, foundation_year, country, rating, memberIds, songIds } = req.body as {
    name: string;
    foundation_year?: number | null;
    country?: string;
    rating?: number | null;
    memberIds?: string[];
    songIds?: string[];
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'Название обязательно' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE band SET name=$1, foundation_year=$2, country=$3, rating=$4
       WHERE id=$5 AND created_by=$6 RETURNING *`,
      [name.trim(), foundation_year ?? null, country?.trim() ?? '', rating ?? null, id, req.userId]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Группа не найдена или нет доступа' });
      return;
    }

    await client.query('DELETE FROM band_member WHERE band_id = $1', [id]);
    await client.query('DELETE FROM repertoire WHERE band_id = $1', [id]);

    if (memberIds?.length) {
      await client.query(
        `INSERT INTO band_member (band_id, singer_id) SELECT $1, UNNEST($2::uuid[])`,
        [id, memberIds]
      );
    }
    if (songIds?.length) {
      await client.query(
        `INSERT INTO repertoire (band_id, song_id) SELECT $1, UNNEST($2::uuid[])`,
        [id, songIds]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[bands] updateBand error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
}

// DELETE /api/bands/:id
export async function deleteBand(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM band WHERE id = $1 AND created_by = $2',
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Группа не найдена или нет доступа' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[bands] deleteBand error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
