import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

export async function getTours(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(`
      SELECT t.*,
        row_to_json(b.*) AS band,
        row_to_json(s.*) AS singer_data
      FROM tour t
      LEFT JOIN band b ON b.id = t.band_id
      LEFT JOIN singer s ON s.id = t.singer_id
      WHERE t.created_by = $1
      ORDER BY t.start_date DESC NULLS LAST
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('[tours] getTours error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function getTourSongs(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const access = await db.query(
      'SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const result = await db.query(
      `SELECT so.* FROM song so JOIN tour_song ts ON ts.song_id = so.id WHERE ts.tour_id=$1`, [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[tours] getTourSongs error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function getTourStops(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const access = await db.query(
      'SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const result = await db.query(
      `SELECT id, tour_id, city, event_date,
        COALESCE(ticket_price, 0) AS ticket_price,
        created_at
       FROM tour_stops WHERE tour_id=$1 ORDER BY event_date ASC NULLS LAST`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[tours] getTourStops error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function addTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { city, event_date, ticket_price } = req.body as {
    city?: string; event_date?: string | null; ticket_price?: number;
  };
  try {
    const access = await db.query(
      'SELECT id, start_date, end_date FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const tour = access.rows[0];
    if (event_date && tour.start_date && tour.end_date) {
      const stopDate = new Date(event_date);
      if (stopDate < new Date(tour.start_date) || stopDate > new Date(tour.end_date)) {
        res.status(400).json({
          error: `Дата концерта должна быть в пределах тура: ${tour.start_date} — ${tour.end_date}`,
        });
        return;
      }
    }
    const result = await db.query(
      `INSERT INTO tour_stops (tour_id, city, event_date, ticket_price)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, city?.trim() ?? '', event_date || null, ticket_price ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[tours] addTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function updateTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { id, stopId } = req.params;
  const { city, event_date, ticket_price } = req.body as {
    city?: string; event_date?: string | null; ticket_price?: number;
  };
  try {
    const access = await db.query(
      'SELECT id, start_date, end_date FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const tour = access.rows[0];
    if (event_date && tour.start_date && tour.end_date) {
      const stopDate = new Date(event_date);
      if (stopDate < new Date(tour.start_date) || stopDate > new Date(tour.end_date)) {
        res.status(400).json({
          error: `Дата концерта должна быть в пределах тура: ${tour.start_date} — ${tour.end_date}`,
        });
        return;
      }
    }
    const result = await db.query(
      `UPDATE tour_stops SET city=$1, event_date=$2, ticket_price=$3 WHERE id=$4 RETURNING *`,
      [city?.trim() ?? '', event_date || null, ticket_price ?? 0, stopId]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Остановка не найдена' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[tours] updateTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function deleteTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { id, stopId } = req.params;
  try {
    const access = await db.query(
      'SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    await db.query('DELETE FROM tour_stops WHERE id=$1', [stopId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[tours] deleteTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function getTourFinances(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT
        COALESCE(fee, 0)::numeric                        AS fee,
        COALESCE(tax_percent, 0)::numeric                AS tax_percent,
        COALESCE(agent_commission_percent, 0)::numeric   AS agent_commission_percent,
        COALESCE(transport, 0)::numeric                  AS transport,
        COALESCE(per_diem, 0)::numeric                   AS per_diem,
        COALESCE(hotel, 0)::numeric                      AS hotel,
        COALESCE(other_expenses, 0)::numeric             AS other_expenses,
        COALESCE(avg_ticket_price, 0)::numeric           AS avg_ticket_price,
        COALESCE(city_coefficient, 1.0)::numeric         AS city_coefficient,
        COALESCE(base_ticket_price, 1000)::numeric       AS base_ticket_price
       FROM tour WHERE id=$1 AND created_by=$2`,
      [id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const row = result.rows[0];
    const f = {
      fee:                      parseFloat(row.fee) || 0,
      tax_percent:              parseFloat(row.tax_percent) || 0,
      agent_commission_percent: parseFloat(row.agent_commission_percent) || 0,
      transport:                parseFloat(row.transport) || 0,
      per_diem:                 parseFloat(row.per_diem) || 0,
      hotel:                    parseFloat(row.hotel) || 0,
      other_expenses:           parseFloat(row.other_expenses) || 0,
      avg_ticket_price:         parseFloat(row.avg_ticket_price) || 0,
      city_coefficient:         parseFloat(row.city_coefficient) || 1.0,
      base_ticket_price:        parseFloat(row.base_ticket_price) || 1000,
    };
    const tax = f.fee * f.tax_percent / 100;
    const commission = f.fee * f.agent_commission_percent / 100;
    const totalExpenses = tax + commission + f.transport + f.per_diem + f.hotel + f.other_expenses;
    res.json({ ...f, profit: Math.round(f.fee - totalExpenses) });
  } catch (err) {
    console.error('[tours] getTourFinances error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function updateTourFinances(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    fee, tax_percent, agent_commission_percent,
    transport, per_diem, hotel, other_expenses,
    base_ticket_price, city_coefficient,
  } = req.body as Record<string, number | undefined>;

  try {
    const tourData = await db.query(
      `SELECT t.band_id, t.singer_id, b.rating AS band_rating, s.rating AS singer_rating
       FROM tour t
       LEFT JOIN band b ON b.id = t.band_id
       LEFT JOIN singer s ON s.id = t.singer_id
       WHERE t.id=$1 AND t.created_by=$2`,
      [id, req.userId]
    );
    if (tourData.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }

    const row = tourData.rows[0];
    const rating = parseFloat(row.band_rating ?? row.singer_rating ?? '5') || 5;
    const coeff = parseFloat(String(city_coefficient ?? 1.0)) || 1.0;
    const basePrice = parseFloat(String(base_ticket_price ?? 1000)) || 1000;
    const calculatedAvgTicketPrice = Math.round(basePrice * coeff * (rating / 10 + 0.5));

    const safe = (v: number | undefined) => parseFloat(String(v ?? 0)) || 0;

    const result = await db.query(
      `UPDATE tour SET
         fee=$1, tax_percent=$2, agent_commission_percent=$3,
         transport=$4, per_diem=$5, hotel=$6, other_expenses=$7,
         city_coefficient=$8, avg_ticket_price=$9, base_ticket_price=$10
       WHERE id=$11 AND created_by=$12 RETURNING *`,
      [
        safe(fee), safe(tax_percent), safe(agent_commission_percent),
        safe(transport), safe(per_diem), safe(hotel), safe(other_expenses),
        coeff, calculatedAvgTicketPrice, basePrice, id, req.userId,
      ]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[tours] updateTourFinances error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function createTour(req: AuthRequest, res: Response): Promise<void> {
  const {
    program_name, city, start_date, end_date,
    avg_ticket_price, band_id, singer_id, songIds,
  } = req.body as {
    program_name?: string; city?: string;
    start_date?: string | null; end_date?: string | null;
    avg_ticket_price?: number;
    band_id?: string | null; singer_id?: string | null;
    songIds?: string[];
  };

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Название программы обязательно' });
    return;
  }
  if (!band_id && !singer_id) {
    res.status(400).json({ error: 'Укажите группу или исполнителя' });
    return;
  }
  if (band_id && singer_id) {
    res.status(400).json({ error: 'Тур может принадлежать либо группе, либо исполнителю' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO tour
         (program_name, city, start_date, end_date, avg_ticket_price, band_id, singer_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        program_name.trim(), city?.trim() ?? '',
        start_date || null, end_date || null,
        parseFloat(String(avg_ticket_price ?? 0)) || 0,
        band_id || null,
        singer_id || null,
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

export async function updateTour(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    program_name, city, start_date, end_date,
    avg_ticket_price, band_id, singer_id, songIds,
  } = req.body as {
    program_name?: string; city?: string;
    start_date?: string | null; end_date?: string | null;
    avg_ticket_price?: number;
    band_id?: string | null; singer_id?: string | null;
    songIds?: string[];
  };

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Название программы обязательно' });
    return;
  }
  if (!band_id && !singer_id) {
    res.status(400).json({ error: 'Укажите группу или исполнителя' });
    return;
  }
  if (band_id && singer_id) {
    res.status(400).json({ error: 'Тур может принадлежать либо группе, либо исполнителю' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE tour SET program_name=$1, city=$2, start_date=$3, end_date=$4,
       avg_ticket_price=$5, band_id=$6, singer_id=$7
       WHERE id=$8 AND created_by=$9 RETURNING *`,
      [
        program_name.trim(), city?.trim() ?? '',
        start_date || null, end_date || null,
        parseFloat(String(avg_ticket_price ?? 0)) || 0,
        band_id || null,
        singer_id || null,
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

export async function deleteTour(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
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

export async function getTourRiderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const tour = await db.query(
      'SELECT rider_status FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (!tour.rows[0]) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const items = await db.query(
      'SELECT id, status FROM rider_checklist WHERE tour_id=$1', [id]
    );
    let riderStatus: 'empty' | 'partial' | 'complete' = 'empty';
    if (items.rows.length > 0) {
      const confirmed = items.rows.filter((r: { status: string }) => r.status === 'confirmed').length;
      riderStatus = confirmed === items.rows.length ? 'complete' : 'partial';
    }
    if (riderStatus !== tour.rows[0].rider_status) {
      await db.query('UPDATE tour SET rider_status=$1 WHERE id=$2', [riderStatus, id]);
    }
    res.json({ rider_status: riderStatus, items: items.rows });
  } catch (err) {
    console.error('[tours] getTourRiderStatus error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
