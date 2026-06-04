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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/tours/:id/songs
export async function getTourSongs(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT so.* FROM song so JOIN tour_song ts ON ts.song_id = so.id WHERE ts.tour_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[tours] getTourSongs error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/tours/:id/stops
export async function getTourStops(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM tour_stops WHERE tour_id = $1 ORDER BY event_date ASC NULLS LAST',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[tours] getTourStops error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/tours/:id/stops
export async function addTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { city, event_date, avg_ticket_price } = req.body as {
    city?: string; event_date?: string | null; avg_ticket_price?: number;
  };
  try {
    const result = await db.query(
      `INSERT INTO tour_stops (tour_id, city, event_date, avg_ticket_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, city?.trim() ?? '', event_date || null, avg_ticket_price ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[tours] addTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// PUT /api/tours/:id/stops/:stopId
export async function updateTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { stopId } = req.params;
  const { city, event_date, avg_ticket_price } = req.body as {
    city?: string; event_date?: string | null; avg_ticket_price?: number;
  };
  try {
    const result = await db.query(
      `UPDATE tour_stops SET city=$1, event_date=$2, avg_ticket_price=$3
       WHERE id=$4 RETURNING *`,
      [city?.trim() ?? '', event_date || null, avg_ticket_price ?? 0, stopId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Остановка не найдена' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[tours] updateTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// DELETE /api/tours/:id/stops/:stopId
export async function deleteTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { stopId } = req.params;
  try {
    await db.query('DELETE FROM tour_stops WHERE id = $1', [stopId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[tours] deleteTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/tours/:id/finances
export async function getTourFinances(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT fee, tax_percent, agent_commission_percent, transport,
              per_diem, hotel, other_expenses FROM tour WHERE id = $1`,
      [id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Тур не найден' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[tours] getTourFinances error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// PUT /api/tours/:id/finances
export async function updateTourFinances(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    fee, tax_percent, agent_commission_percent,
    transport, per_diem, hotel, other_expenses
  } = req.body as {
    fee?: number; tax_percent?: number; agent_commission_percent?: number;
    transport?: number; per_diem?: number; hotel?: number; other_expenses?: number;
  };
  try {
    const result = await db.query(
      `UPDATE tour SET fee=$1, tax_percent=$2, agent_commission_percent=$3,
       transport=$4, per_diem=$5, hotel=$6, other_expenses=$7
       WHERE id=$8 AND created_by=$9 RETURNING *`,
      [
        fee ?? 0, tax_percent ?? 0, agent_commission_percent ?? 0,
        transport ?? 0, per_diem ?? 0, hotel ?? 0, other_expenses ?? 0,
        id, req.userId
      ]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Тур не найден или нет доступа' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[tours] updateTourFinances error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/tours
export async function createTour(req: AuthRequest, res: Response): Promise<void> {
  const { program_name, city, start_date, end_date, avg_ticket_price, band_id, songIds } = req.body as {
    program_name?: string; city?: string; start_date?: string | null;
    end_date?: string | null; avg_ticket_price?: number; band_id?: string; songIds?: string[];
  };

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Название программы обязательно' });
    return;
  }
  if (!band_id) {
    res.status(400).json({ error: 'Группа обязательна' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
}

// PUT /api/tours/:id
export async function updateTour(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { program_name, city, start_date, end_date, avg_ticket_price, band_id, songIds } = req.body as {
    program_name?: string; city?: string; start_date?: string | null;
    end_date?: string | null; avg_ticket_price?: number; band_id?: string; songIds?: string[];
  };

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Название программы обязательно' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE tour SET program_name=$1, city=$2, start_date=$3, end_date=$4,
       avg_ticket_price=$5, band_id=$6 WHERE id=$7 AND created_by=$8 RETURNING *`,
      [program_name.trim(), city?.trim() ?? '', start_date || null, end_date || null, avg_ticket_price ?? 0, band_id, id, req.userId]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Тур не найден или нет доступа' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
      res.status(404).json({ error: 'Тур не найден или нет доступа' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[tours] deleteTour error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
