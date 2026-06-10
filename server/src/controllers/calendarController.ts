import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

export async function getCalendarEvents(req: AuthRequest, res: Response): Promise<void> {
  const { year, month } = req.query as { year?: string; month?: string };
  try {
    let whereDate = '';
    const params: (string | number)[] = [req.userId!];

    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      whereDate = `AND (t.start_date <= $3 AND (t.end_date >= $2 OR t.start_date >= $2))`;
      params.push(start, end);
    }

    const tours = await db.query(
      `SELECT
         t.id,
         t.program_name AS title,
         t.city,
         t.start_date,
         t.end_date,
         b.name AS band_name,
         'tour' AS type,
         COALESCE(
           json_agg(
             jsonb_build_object(
               'id', ts.id,
               'city', ts.city,
               'event_date', ts.event_date,
               'ticket_price', COALESCE(ts.ticket_price, 0)
             ) ORDER BY ts.event_date
           ) FILTER (WHERE ts.id IS NOT NULL), '[]'
         ) AS stops
       FROM tour t
       LEFT JOIN band b ON b.id = t.band_id
       LEFT JOIN tour_stops ts ON ts.tour_id = t.id
       WHERE t.created_by = $1 ${whereDate}
       GROUP BY t.id, b.name
       ORDER BY t.start_date`,
      params
    );

    const accepted = await db.query(
      `SELECT id, organization AS title, city, proposed_date AS start_date,
              proposed_date AS end_date, sender_name, 'offer' AS type
       FROM messages
       WHERE user_id=$1 AND status='accepted' AND proposed_date IS NOT NULL`,
      [req.userId]
    );

    res.json({
      events: [
        ...tours.rows.map(r => ({ ...r, color: '#6366f1' })),
        ...accepted.rows.map(r => ({ ...r, color: '#34d399', stops: [] })),
      ],
    });
  } catch (err) {
    console.error('[calendar] getCalendarEvents:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function checkConflicts(req: AuthRequest, res: Response): Promise<void> {
  const { startDate, endDate, bandId, tourId } = req.query as {
    startDate?: string; endDate?: string; bandId?: string; tourId?: string;
  };
  if (!startDate || !bandId) { res.json({ conflicts: [] }); return; }
  try {
    const result = await db.query(
      `SELECT t.id, t.program_name, t.city, t.start_date, t.end_date
       FROM tour t
       WHERE t.band_id = $1
         AND t.id != COALESCE($4::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
         AND t.start_date IS NOT NULL
         AND (
           t.start_date <= $3::date
           AND COALESCE(t.end_date, t.start_date) >= $2::date
         )`,
      [bandId, startDate, endDate || startDate, tourId || null]
    );
    res.json({ conflicts: result.rows });
  } catch (err) {
    console.error('[calendar] checkConflicts:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
