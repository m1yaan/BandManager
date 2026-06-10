import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

export async function getSongs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT s.*,
        c1.name AS composer_name, c1.id AS composer_id,
        c2.name AS lyricist_name, c2.id AS lyricist_id,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', si.id, 'name', si.name))
          FILTER (WHERE si.id IS NOT NULL), '[]'
        ) AS singers,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name))
          FILTER (WHERE b.id IS NOT NULL), '[]'
        ) AS bands
       FROM song s
       LEFT JOIN contributor c1 ON c1.id = s.composer_id
       LEFT JOIN contributor c2 ON c2.id = s.lyricist_id
       LEFT JOIN song_singer ss ON ss.song_id = s.id
       LEFT JOIN singer si ON si.id = ss.singer_id
       LEFT JOIN song_band sb ON sb.song_id = s.id
       LEFT JOIN band b ON b.id = sb.band_id
       WHERE s.created_by = $1
       GROUP BY s.id, c1.name, c1.id, c2.name, c2.id
       ORDER BY s.title`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[songs] getSongs error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

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

export async function getSongBands(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT b.* FROM band b
       JOIN song_band sb ON sb.band_id = b.id
       WHERE sb.song_id = $1 AND b.created_by = $2`,
      [id, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[songs] getSongBands error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function addSongSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { singerId } = req.body as { singerId?: string };
  if (!singerId) { res.status(400).json({ error: 'singerId обязателен' }); return; }
  try {
    await db.query(
      `INSERT INTO song_singer (song_id, singer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, singerId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[songs] addSongSinger error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function removeSongSinger(req: AuthRequest, res: Response): Promise<void> {
  const { id, singerId } = req.params;
  try {
    await db.query('DELETE FROM song_singer WHERE song_id=$1 AND singer_id=$2', [id, singerId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[songs] removeSongSinger error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function createSong(req: AuthRequest, res: Response): Promise<void> {
  const { title, composer_id, lyricist_id, release_date, creation_year, singerIds, bandIds } = req.body as {
    title?: string;
    composer_id?: string | null;
    lyricist_id?: string | null;
    release_date?: string | null;
    creation_year?: number | null;
    singerIds?: string[];
    bandIds?: string[];
  };
  if (!title?.trim()) {
    res.status(400).json({ error: 'Название обязательно' });
    return;
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    let finalReleaseDate = release_date || null;
    if (!finalReleaseDate && creation_year) {
      finalReleaseDate = `${creation_year}-01-01`;
    }

    const result = await client.query(
      `INSERT INTO song (title, composer_id, lyricist_id, release_date, creation_year, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        title.trim(),
        composer_id || null,
        lyricist_id || null,
        finalReleaseDate,
        creation_year ?? null,
        req.userId,
      ]
    );
    const song = result.rows[0];

    if (singerIds?.length) {
      await client.query(
        `INSERT INTO song_singer (song_id, singer_id)
         SELECT $1, UNNEST($2::uuid[]) ON CONFLICT DO NOTHING`,
        [song.id, singerIds]
      );
    }

    if (bandIds?.length) {
      await client.query(
        `INSERT INTO song_band (song_id, band_id)
         SELECT $1, UNNEST($2::uuid[]) ON CONFLICT DO NOTHING`,
        [song.id, bandIds]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(song);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[songs] createSong error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
}

export async function updateSong(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, composer_id, lyricist_id, release_date, creation_year, singerIds, bandIds } = req.body as {
    title?: string;
    composer_id?: string | null;
    lyricist_id?: string | null;
    release_date?: string | null;
    creation_year?: number | null;
    singerIds?: string[];
    bandIds?: string[];
  };
  if (!title?.trim()) {
    res.status(400).json({ error: 'Название обязательно' });
    return;
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    let finalReleaseDate = release_date || null;
    if (!finalReleaseDate && creation_year) {
      finalReleaseDate = `${creation_year}-01-01`;
    }

    const result = await client.query(
      `UPDATE song SET title=$1, composer_id=$2, lyricist_id=$3,
        release_date=$4, creation_year=$5
       WHERE id=$6 AND created_by=$7 RETURNING *`,
      [
        title.trim(),
        composer_id || null,
        lyricist_id || null,
        finalReleaseDate,
        creation_year ?? null,
        id,
        req.userId,
      ]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Песня не найдена или нет доступа' });
      return;
    }

    if (singerIds !== undefined) {
      await client.query('DELETE FROM song_singer WHERE song_id=$1', [id]);
      if (singerIds.length > 0) {
        await client.query(
          `INSERT INTO song_singer (song_id, singer_id)
           SELECT $1, UNNEST($2::uuid[]) ON CONFLICT DO NOTHING`,
          [id, singerIds]
        );
      }
    }

    if (bandIds !== undefined) {
      await client.query('DELETE FROM song_band WHERE song_id=$1', [id]);
      if (bandIds.length > 0) {
        await client.query(
          `INSERT INTO song_band (song_id, band_id)
           SELECT $1, UNNEST($2::uuid[]) ON CONFLICT DO NOTHING`,
          [id, bandIds]
        );
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[songs] updateSong error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
}

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
