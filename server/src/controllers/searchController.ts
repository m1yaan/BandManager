import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';

export async function globalSearch(req: AuthRequest, res: Response): Promise<void> {
  const { q = '' } = req.query as { q?: string };
  const query = q.trim();

  if (query.length < 2) {
    res.json({ bands: [], singers: [], songs: [], tours: [], messages: [] });
    return;
  }

  const pattern = `%${query}%`;

  try {
    const [bands, singers, songs, tours, messages] = await Promise.all([
      db.query(
        `SELECT id, name, country, rating FROM band
         WHERE created_by = $2 AND LOWER(name) LIKE LOWER($1) LIMIT 5`,
        [pattern, req.userId]
      ),
      db.query(
        `SELECT id, name FROM singer
         WHERE created_by = $2 AND LOWER(name) LIKE LOWER($1) LIMIT 5`,
        [pattern, req.userId]
      ),
      db.query(
        `SELECT id, title, composer FROM song
         WHERE created_by = $2
           AND (LOWER(title) LIKE LOWER($1) OR LOWER(composer) LIKE LOWER($1))
         LIMIT 5`,
        [pattern, req.userId]
      ),
      db.query(
        `SELECT id, program_name, city, start_date FROM tour
         WHERE created_by=$2
           AND (LOWER(program_name) LIKE LOWER($1) OR LOWER(city) LIKE LOWER($1))
         LIMIT 5`,
        [pattern, req.userId]
      ),
      db.query(
        `SELECT id, sender_name, organization, city, status FROM messages
         WHERE user_id=$2
           AND (
             LOWER(sender_name) LIKE LOWER($1) OR
             LOWER(organization) LIKE LOWER($1) OR
             LOWER(message_text) LIKE LOWER($1)
           )
         LIMIT 5`,
        [pattern, req.userId]
      ),
    ]);

    res.json({
      bands: bands.rows,
      singers: singers.rows,
      songs: songs.rows,
      tours: tours.rows,
      messages: messages.rows,
    });
  } catch (err) {
    console.error('[search] globalSearch:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
