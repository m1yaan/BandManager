import { Response } from 'express';
import { PoolClient } from 'pg';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';
import { logAction, getAuditContext } from '../middleware/auditMiddleware';

type TourType = 'tour' | 'concert';

async function recalcTourAvgPrice(client: PoolClient | typeof db, tourId: string): Promise<number> {
  const result = await client.query(
    `SELECT COALESCE(AVG(ticket_price), 0) AS avg FROM tour_stops WHERE tour_id = $1`,
    [tourId]
  );
  const avg = Math.round(parseFloat(result.rows[0].avg) || 0);
  await client.query('UPDATE tour SET avg_ticket_price = $1 WHERE id = $2', [avg, tourId]);
  return avg;
}

export async function getTours(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(`
      SELECT t.*,
        row_to_json(b.*) AS band,
        row_to_json(s.*) AS singer_data,
        (SELECT COUNT(*)::int FROM tour_stops ts WHERE ts.tour_id = t.id) AS stops_count
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
      `SELECT id, type FROM tour WHERE id=$1 AND created_by=$2`, [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    if (access.rows[0].type === 'concert') {
      res.json([]);
      return;
    }
    const result = await db.query(
      `SELECT id, tour_id, city, venue, event_date,
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
  const { city, venue, event_date, ticket_price } = req.body as {
    city?: string; venue?: string; event_date?: string | null; ticket_price?: number;
  };
  try {
    const access = await db.query(
      'SELECT id, type, start_date, end_date FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    const tour = access.rows[0];
    if (tour.type !== 'tour') {
      res.status(400).json({ error: 'Остановки можно добавлять только к турам' });
      return;
    }
    if (event_date && tour.start_date && tour.end_date) {
      const stopDate = new Date(event_date);
      if (stopDate < new Date(tour.start_date) || stopDate > new Date(tour.end_date)) {
        res.status(400).json({
          error: `Дата концерта должна быть в пределах тура: ${tour.start_date} — ${tour.end_date}`,
        });
        return;
      }
    }
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO tour_stops (tour_id, city, venue, event_date, ticket_price)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [id, city?.trim() ?? '', venue?.trim() ?? '', event_date || null, ticket_price ?? 0]
      );
      await recalcTourAvgPrice(client, id);
      await client.query('COMMIT');
      const stop = result.rows[0];
      logAction(req.userId!, 'CREATE', 'tour_stop', stop.id, null, req.body, getAuditContext(req));
      res.status(201).json(stop);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[tours] addTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function updateTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { id, stopId } = req.params;
  const { city, venue, event_date, ticket_price } = req.body as {
    city?: string; venue?: string; event_date?: string | null; ticket_price?: number;
  };
  try {
    const access = await db.query(
      'SELECT id, type, start_date, end_date FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    if (access.rows[0].type !== 'tour') {
      res.status(400).json({ error: 'Остановки можно редактировать только у туров' });
      return;
    }
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
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const oldResult = await client.query(
        'SELECT * FROM tour_stops WHERE id=$1 AND tour_id=$2',
        [stopId, id]
      );
      if (oldResult.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Остановка не найдена' });
        return;
      }
      const result = await client.query(
        `UPDATE tour_stops SET city=$1, venue=$2, event_date=$3, ticket_price=$4
         WHERE id=$5 AND tour_id=$6 RETURNING *`,
        [city?.trim() ?? '', venue?.trim() ?? '', event_date || null, ticket_price ?? 0, stopId, id]
      );
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Остановка не найдена' });
        return;
      }
      await recalcTourAvgPrice(client, id);
      await client.query('COMMIT');
      logAction(req.userId!, 'UPDATE', 'tour_stop', stopId, oldResult.rows[0], req.body, getAuditContext(req));
      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[tours] updateTourStop error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function deleteTourStop(req: AuthRequest, res: Response): Promise<void> {
  const { id, stopId } = req.params;
  try {
    const access = await db.query(
      'SELECT id, type FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }
    if (access.rows[0].type !== 'tour') {
      res.status(400).json({ error: 'Остановки можно удалять только у туров' });
      return;
    }
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const oldResult = await client.query(
        'SELECT * FROM tour_stops WHERE id=$1 AND tour_id=$2',
        [stopId, id]
      );
      if (oldResult.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Остановка не найдена' });
        return;
      }
      await client.query('DELETE FROM tour_stops WHERE id=$1 AND tour_id=$2', [stopId, id]);
      await recalcTourAvgPrice(client, id);
      await client.query('COMMIT');
      logAction(req.userId!, 'DELETE', 'tour_stop', stopId, oldResult.rows[0], null, getAuditContext(req));
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
        COALESCE(agent_commission_percent, 0)::numeric     AS agent_commission_percent,
        COALESCE(transport, 0)::numeric                    AS transport,
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
      `SELECT t.band_id, t.singer_id, t.type, b.rating AS band_rating, s.rating AS singer_rating
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
    const calculatedAvgTicketPrice = row.type === 'tour'
      ? (await db.query(
          `SELECT COALESCE(AVG(ticket_price), 0) AS avg FROM tour_stops WHERE tour_id = $1`, [id]
        )).rows[0]
      : null;
    const avgPrice = row.type === 'tour'
      ? Math.round(parseFloat(calculatedAvgTicketPrice?.avg ?? '0') || 0)
      : Math.round(basePrice * coeff * (rating / 10 + 0.5));

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
        coeff, avgPrice, basePrice, id, req.userId,
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
    type = 'concert',
    program_name, city, venue, start_date, end_date,
    avg_ticket_price, band_id, singer_id, songIds,
  } = req.body as {
    type?: TourType;
    program_name?: string; city?: string; venue?: string;
    start_date?: string | null; end_date?: string | null;
    avg_ticket_price?: number;
    band_id?: string | null; singer_id?: string | null;
    songIds?: string[];
  };

  const tourType: TourType = type === 'tour' ? 'tour' : 'concert';

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Название обязательно' });
    return;
  }
  if (!band_id && !singer_id) {
    res.status(400).json({ error: 'Укажите группу или исполнителя' });
    return;
  }
  if (band_id && singer_id) {
    res.status(400).json({ error: 'Укажите либо группу, либо исполнителя' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    let insertCity = '';
    let insertVenue = '';
    let insertStart: string | null = null;
    let insertEnd: string | null = null;
    let insertPrice = 0;

    if (tourType === 'concert') {
      insertCity = city?.trim() ?? '';
      insertVenue = venue?.trim() ?? '';
      insertStart = start_date || null;
      insertEnd = start_date || null;
      insertPrice = parseFloat(String(avg_ticket_price ?? 0)) || 0;
    } else {
      insertStart = start_date || null;
      insertEnd = end_date || null;
      insertPrice = 0;
    }

    const result = await client.query(
      `INSERT INTO tour
         (program_name, city, venue, start_date, end_date, avg_ticket_price,
          band_id, singer_id, created_by, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        program_name.trim(), insertCity, insertVenue,
        insertStart, insertEnd, insertPrice,
        band_id || null, singer_id || null,
        req.userId, tourType,
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
    logAction(req.userId!, 'CREATE', 'tour', tour.id, null, req.body, getAuditContext(req));
    res.status(201).json({ ...tour, stops_count: 0 });
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
    type, program_name, city, venue, start_date, end_date,
    avg_ticket_price, band_id, singer_id, songIds,
  } = req.body as {
    type?: TourType;
    program_name?: string; city?: string; venue?: string;
    start_date?: string | null; end_date?: string | null;
    avg_ticket_price?: number;
    band_id?: string | null; singer_id?: string | null;
    songIds?: string[];
  };

  if (!program_name?.trim()) {
    res.status(400).json({ error: 'Название обязательно' });
    return;
  }
  if (!band_id && !singer_id) {
    res.status(400).json({ error: 'Укажите группу или исполнителя' });
    return;
  }
  if (band_id && singer_id) {
    res.status(400).json({ error: 'Укажите либо группу, либо исполнителя' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT * FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (existing.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Запись не найдена или нет доступа' });
      return;
    }
    const oldTour = existing.rows[0];

    const tourType: TourType = type === 'tour' || type === 'concert'
      ? type
      : (existing.rows[0].type as TourType) || 'concert';

    if (tourType === 'concert' && existing.rows[0].type === 'tour') {
      await client.query('DELETE FROM tour_stops WHERE tour_id=$1', [id]);
    }

    let updateCity = '';
    let updateVenue = '';
    let updateStart: string | null = null;
    let updateEnd: string | null = null;
    let updatePrice = 0;

    if (tourType === 'concert') {
      updateCity = city?.trim() ?? '';
      updateVenue = venue?.trim() ?? '';
      updateStart = start_date || null;
      updateEnd = start_date || null;
      updatePrice = parseFloat(String(avg_ticket_price ?? 0)) || 0;
    } else {
      updateStart = start_date || null;
      updateEnd = end_date || null;
      const avgResult = await client.query(
        `SELECT COALESCE(AVG(ticket_price), 0) AS avg FROM tour_stops WHERE tour_id = $1`, [id]
      );
      updatePrice = Math.round(parseFloat(avgResult.rows[0].avg) || 0);
    }

    const result = await client.query(
      `UPDATE tour SET program_name=$1, city=$2, venue=$3, start_date=$4, end_date=$5,
       avg_ticket_price=$6, band_id=$7, singer_id=$8, type=$9
       WHERE id=$10 AND created_by=$11 RETURNING *`,
      [
        program_name.trim(), updateCity, updateVenue,
        updateStart, updateEnd, updatePrice,
        band_id || null, singer_id || null, tourType,
        id, req.userId,
      ]
    );

    await client.query('DELETE FROM tour_song WHERE tour_id=$1', [id]);
    if (songIds?.length) {
      await client.query(
        `INSERT INTO tour_song (tour_id, song_id) SELECT $1, UNNEST($2::uuid[])`,
        [id, songIds]
      );
    }
    await client.query('COMMIT');
    const stopsCount = await db.query(
      'SELECT COUNT(*)::int AS c FROM tour_stops WHERE tour_id=$1', [id]
    );
    logAction(req.userId!, 'UPDATE', 'tour', id, oldTour, req.body, getAuditContext(req));
    res.json({ ...result.rows[0], stops_count: stopsCount.rows[0].c });
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
    const oldResult = await db.query(
      'SELECT * FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]
    );
    if (oldResult.rowCount === 0) {
      res.status(404).json({ error: 'Тур не найден или нет доступа' });
      return;
    }
    await db.query('DELETE FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]);
    logAction(req.userId!, 'DELETE', 'tour', id, oldResult.rows[0], null, getAuditContext(req));
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
