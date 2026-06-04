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
```

**Файл: server/src/controllers/riderController.ts**
```typescript
import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/tours/:id/rider
export async function getRider(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM rider_checklist WHERE tour_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[rider] getRider error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/tours/:id/rider
export async function addRiderItem(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { item_name, status, photo_url, note } = req.body as {
    item_name?: string; status?: string; photo_url?: string; note?: string;
  };
  if (!item_name?.trim()) {
    res.status(400).json({ error: 'Название пункта обязательно' });
    return;
  }
  try {
    const result = await db.query(
      `INSERT INTO rider_checklist (tour_id, item_name, status, photo_url, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, item_name.trim(), status ?? 'pending', photo_url?.trim() ?? '', note?.trim() ?? '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[rider] addRiderItem error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// PUT /api/rider/:itemId
export async function updateRiderItem(req: AuthRequest, res: Response): Promise<void> {
  const { itemId } = req.params;
  const { item_name, status, photo_url, note } = req.body as {
    item_name?: string; status?: string; photo_url?: string; note?: string;
  };
  try {
    const result = await db.query(
      `UPDATE rider_checklist SET item_name=$1, status=$2, photo_url=$3, note=$4
       WHERE id=$5 RETURNING *`,
      [item_name?.trim() ?? '', status ?? 'pending', photo_url?.trim() ?? '', note?.trim() ?? '', itemId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Пункт не найден' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[rider] updateRiderItem error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// DELETE /api/rider/:itemId
export async function deleteRiderItem(req: AuthRequest, res: Response): Promise<void> {
  const { itemId } = req.params;
  try {
    await db.query('DELETE FROM rider_checklist WHERE id = $1', [itemId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[rider] deleteRiderItem error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
```

**Файл: server/src/controllers/reportsController.ts**
```typescript
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