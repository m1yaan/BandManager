import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';
import { ownershipFilter, userScopeFilter, ownershipFilterColumn } from '../db/ownership';

function monthBounds(year: number, month: number): { start: string; end: string } {
  const daysInMonth = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
  };
}

export async function getCalendarEvents(req: AuthRequest, res: Response): Promise<void> {
  const { year, month } = req.query as { year?: string; month?: string };
  try {
    let dateFilter = '';
    const params: (string | number)[] = [req.userId!];

    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const { start, end } = monthBounds(y, m);
      dateFilter = `AND event_date >= $2::date AND event_date <= $3::date`;
      params.push(start, end);
    }

    const concerts = await db.query(
      `SELECT t.id, t.id AS tour_id, t.program_name AS title,
              t.city, t.venue, t.start_date AS event_date,
              b.name AS band_name, s.name AS singer_name,
              'concert' AS type
       FROM tour t
       LEFT JOIN band b ON b.id = t.band_id
       LEFT JOIN singer s ON s.id = t.singer_id
       WHERE ${ownershipFilter('t', '$1')}
         AND COALESCE(t.type, 'concert') = 'concert'
         AND t.start_date IS NOT NULL
         ${dateFilter.replace(/event_date/g, 't.start_date')}`,
      params
    );

    const stops = await db.query(
      `SELECT ts.id, t.id AS tour_id, t.program_name AS title,
              ts.city, ts.venue, ts.event_date,
              b.name AS band_name, s.name AS singer_name,
              'stop' AS type
       FROM tour_stops ts
       JOIN tour t ON t.id = ts.tour_id
       LEFT JOIN band b ON b.id = t.band_id
       LEFT JOIN singer s ON s.id = t.singer_id
       WHERE ${ownershipFilter('t', '$1')}
         AND t.type = 'tour'
         AND ts.event_date IS NOT NULL
         ${dateFilter}`,
      params
    );

    let acceptedDateFilter = '';
    const acceptedParams: (string | number)[] = [req.userId!];
    if (year && month) {
      acceptedParams.push(params[1] as string, params[2] as string);
      acceptedDateFilter = `AND m.proposed_date >= $2::date AND m.proposed_date <= $3::date`;
    }

    const accepted = await db.query(
      `SELECT m.id, NULL::uuid AS tour_id, m.organization AS title,
              m.city, '' AS venue, m.proposed_date AS event_date,
              NULL AS band_name, NULL AS singer_name,
              'offer' AS type
       FROM messages m
       WHERE ${userScopeFilter('m.user_id', '$1')}
         AND m.status = 'accepted'
         AND m.proposed_date IS NOT NULL
         ${acceptedDateFilter}
         AND NOT EXISTS (
           SELECT 1 FROM tour t
           WHERE ${ownershipFilterColumn('t', 'm.user_id')}
             AND t.start_date = m.proposed_date
             AND COALESCE(t.city, '') = COALESCE(m.city, '')
             AND (
               (m.band_id IS NOT NULL AND t.band_id = m.band_id)
               OR (m.singer_id IS NOT NULL AND t.singer_id = m.singer_id)
             )
         )`,
      acceptedParams
    );

    const colorMap: Record<string, string> = {
      concert: '#a78bfa',
      stop:    '#6366f1',
      offer:   '#34d399',
    };

    const allEvents = [...concerts.rows, ...stops.rows, ...accepted.rows].map(r => ({
      id: r.id,
      tour_id: r.tour_id,
      title: r.title,
      city: r.city ?? '',
      venue: r.venue ?? '',
      start_date: r.event_date,
      end_date: r.event_date,
      band_name: r.band_name,
      singer_name: r.singer_name,
      type: r.type,
      color: colorMap[r.type as string] ?? '#6366f1',
    }));

    res.json({ events: allEvents });
  } catch (err) {
    console.error('[calendar] getCalendarEvents:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function checkConflicts(req: AuthRequest, res: Response): Promise<void> {
  const { startDate, endDate, bandId, singerId, tourId } = req.query as {
    startDate?: string; endDate?: string; bandId?: string; singerId?: string; tourId?: string;
  };
  if (!startDate || (!bandId && !singerId)) { res.json({ conflicts: [] }); return; }
  try {
    const ownerFilter = bandId
      ? 't.band_id = $1'
      : 't.singer_id = $1';
    const ownerId = bandId ?? singerId;

    const result = await db.query(
      `SELECT t.id, t.program_name, t.city, t.start_date, t.end_date
       FROM tour t
       WHERE ${ownerFilter}
         AND ${ownershipFilter('t', '$5')}
         AND t.id != COALESCE($4::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
         AND t.start_date IS NOT NULL
         AND (
           t.start_date <= $3::date
           AND COALESCE(t.end_date, t.start_date) >= $2::date
         )`,
      [ownerId, startDate, endDate || startDate, tourId || null, req.userId]
    );
    res.json({ conflicts: result.rows });
  } catch (err) {
    console.error('[calendar] checkConflicts:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
