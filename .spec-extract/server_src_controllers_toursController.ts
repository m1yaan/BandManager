import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/tours
export async function getTours(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(`
      SELECT t.*, row_to_json(b.*) AS band
      FROM tour t
      LEFT JOIN band b ON b.id = t.band_id
      ORDER BY t.start_date DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[tours] getTours error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/tours/:id/songs
export async function getTourSongs(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT so.* FROM song so
       JOIN tour_song ts ON ts.song_id = so.id
       WHERE ts.tour_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[tours] getTourSongs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/tours
export async function createTour(req: AuthRequest, res: Response): Promise<void> {
  const { program_name, city, start_date, end_date, avg_ticket_price, band_id, songIds } = req.body as {
    program_name?: string;
    city?: string;
    start_date?: string | null;
    end_date?: string | null;
    avg_ticket_price?: number;
    band_id?: string;
    songIds?: string[];
  };

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Program name is required' });
    return;
  }
  if (!band_id) {
    res.status(400).json({ error: 'Band is required' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO tour (program_name, city, start_date, end_date, avg_ticket_price, band_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [program_name.trim(), city?.trim() ?? '', start_date || null, end_date || null, avg_ticket_price ?? 0, band_id, req.userId]
    );
    const tour = result.rows[0];

    if (songIds && songIds.length > 0) {
      await client.query(
        `INSERT INTO tour_song (tour_id, song_id) SELECT $1, UNNEST($2::uuid[])`,
        [tour.id, songIds]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(tour);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tours] createTour error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

// PUT /api/tours/:id
export async function updateTour(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { program_name, city, start_date, end_date, avg_ticket_price, band_id, songIds } = req.body as {
    program_name?: string;
    city?: string;
    start_date?: string | null;
    end_date?: string | null;
    avg_ticket_price?: number;
    band_id?: string;
    songIds?: string[];
  };

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Program name is required' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE tour SET program_name=$1, city=$2, start_date=$3, end_date=$4,
       avg_ticket_price=$5, band_id=$6
       WHERE id=$7 AND created_by=$8 RETURNING *`,
      [program_name.trim(), city?.trim() ?? '', start_date || null, end_date || null, avg_ticket_price ?? 0, band_id, id, req.userId]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Tour not found or permission denied' });
      return;
    }

    await client.query('DELETE FROM tour_song WHERE tour_id = $1', [id]);
    if (songIds && songIds.length > 0) {
      await client.query(
        `INSERT INTO tour_song (tour_id, song_id) SELECT $1, UNNEST($2::uuid[])`,
        [id, songIds]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tours] updateTour error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

// DELETE /api/tours/:id
export async function deleteTour(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM tour WHERE id = $1 AND created_by = $2',
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Tour not found or permission denied' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[tours] deleteTour error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}