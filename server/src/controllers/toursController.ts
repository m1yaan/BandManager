import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/tours — только свои, LEFT JOIN для band
export async function getTours(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Задача 4: LEFT JOIN — туры без группы тоже отображаются
    const result = await db.query(`
      SELECT t.*, row_to_json(b.*) AS band
      FROM tour t
      LEFT JOIN band b ON b.id = t.band_id
      WHERE t.created_by = $1
      ORDER BY t.start_date DESC NULLS LAST
    `, [req.userId]);
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
    // Проверяем доступ
    const access = await db.query(
      'SELECT id FROM tour WHERE id=$1 AND created_by=$2',
      [id, req.userId]
    );
    if (access.rowCount === 0) {
      res.status(404).json({ error: 'Тур не найден' });
      return;
    }
    const result = await db.query(
      `SELECT so.* FROM song so JOIN tour_song ts ON ts.song_id = so.id WHERE ts.tour_id=$1`,
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
    const access = await db.query('SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]);
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const result = await db.query(
      'SELECT * FROM tour_stops WHERE tour_id=$1 ORDER BY event_date ASC NULLS LAST',
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
    const access = await db.query('SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]);
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const result = await db.query(
      `INSERT INTO tour_stops (tour_id, city, event_date, avg_ticket_price) VALUES ($1,$2,$3,$4) RETURNING *`,
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
  const { id, stopId } = req.params;
  const { city, event_date, avg_ticket_price } = req.body as {
    city?: string; event_date?: string | null; avg_ticket_price?: number;
  };
  try {
    const access = await db.query('SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]);
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const result = await db.query(
      `UPDATE tour_stops SET city=$1, event_date=$2, avg_ticket_price=$3 WHERE id=$4 RETURNING *`,
      [city?.trim() ?? '', event_date || null, avg_ticket_price ?? 0, stopId]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Остановка не найдена' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[tours] updateTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// DELETE /api/tours/:id/stops/:stopId
export async function deleteTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { id, stopId } = req.params;
  try {
    const access = await db.query('SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]);
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    await db.query('DELETE FROM tour_stops WHERE id=$1', [stopId]);
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
              per_diem, hotel, other_expenses, avg_ticket_price, city_coefficient
       FROM tour WHERE id=$1 AND created_by=$2`,
      [id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Тур не найден' }); return; }
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
    transport, per_diem, hotel, other_expenses,
    base_price, city_coefficient,
  } = req.body as {
    fee?: number; tax_percent?: number; agent_commission_percent?: number;
    transport?: number; per_diem?: number; hotel?: number; other_expenses?: number;
    base_price?: number; city_coefficient?: number;
  };

  try {
    // Задача 3: avg_ticket_price рассчитывается автоматически
    // Сначала получаем рейтинг группы
    const tourData = await db.query(
      `SELECT t.band_id, b.rating FROM tour t LEFT JOIN band b ON b.id = t.band_id
       WHERE t.id=$1 AND t.created_by=$2`,
      [id, req.userId]
    );
    if (tourData.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }

    const groupRating = tourData.rows[0].rating ?? 5; // дефолт 5 если нет рейтинга
    const coeff      = city_coefficient ?? 1.0;
    const basePx     = base_price ?? 1000;

    // avg_ticket_price = base_price * city_coefficient * (rating/10 + 0.5)
    const calculatedAvgPrice = Math.round(basePx * coeff * (groupRating / 10 + 0.5));

    const result = await db.query(
      `UPDATE tour SET
         fee=$1, tax_percent=$2, agent_commission_percent=$3,
         transport=$4, per_diem=$5, hotel=$6, other_expenses=$7,
         city_coefficient=$8, avg_ticket_price=$9
       WHERE id=$10 AND created_by=$11 RETURNING *`,
      [
        fee ?? 0, tax_percent ?? 0, agent_commission_percent ?? 0,
        transport ?? 0, per_diem ?? 0, hotel ?? 0, other_expenses ?? 0,
        coeff, calculatedAvgPrice, id, req.userId,
      ]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
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
    end_date?: string | null; avg_ticket_price?: number; band_id?: string | null; songIds?: string[];
  };

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Название программы обязательно' });
    return;
  }
  // Задача 4: band_id может быть null

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO tour (program_name, city, start_date, end_date, avg_ticket_price, band_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        program_name.trim(), city?.trim() ?? '',
        start_date || null, end_date || null,
        avg_ticket_price ?? 0,
        band_id || null,   // Задача 4: NULL допустим
        req.userId,
      ]
    );
    const tour = result.rows[0];

    if (songIds?.length) {
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
    end_date?: string | null; avg_ticket_price?: number; band_id?: string | null; songIds?: string[];
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
       avg_ticket_price=$5, band_id=$6
       WHERE id=$7 AND created_by=$8 RETURNING *`,
      [
        program_name.trim(), city?.trim() ?? '',
        start_date || null, end_date || null,
        avg_ticket_price ?? 0,
        band_id || null,
        id, req.userId,
      ]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Тур не найден или нет доступа' });
      return;
    }

    await client.query('DELETE FROM tour_song WHERE tour_id=$1', [id]);
    if (songIds?.length) {
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
      'DELETE FROM tour WHERE id=$1 AND created_by=$2',
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

// GET /api/tours/:id/rider
export async function getTourRiderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const tour = await db.query(
      'SELECT rider_status FROM tour WHERE id=$1 AND created_by=$2',
      [id, req.userId]
    );
    if (!tour.rows[0]) { res.status(404).json({ error: 'Тур не найден' }); return; }

    const items = await db.query(
      'SELECT id, status FROM rider_checklist WHERE tour_id=$1',
      [id]
    );

    // Пересчитываем статус
    let riderStatus: 'empty' | 'partial' | 'complete' = 'empty';
    if (items.rows.length > 0) {
      const confirmed = items.rows.filter((r: { status: string }) => r.status === 'confirmed').length;
      riderStatus = confirmed === items.rows.length ? 'complete' : 'partial';
    }

    // Обновляем если изменился
    if (riderStatus !== tour.rows[0].rider_status) {
      await db.query('UPDATE tour SET rider_status=$1 WHERE id=$2', [riderStatus, id]);
    }

    res.json({ rider_status: riderStatus, items: items.rows });
  } catch (err) {
    console.error('[tours] getTourRiderStatus error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
