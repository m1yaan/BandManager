import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

const SENDER_NAMES = [
  'Алексей Иванов', 'Мария Петрова', 'Дмитрий Соколов', 'Елена Кузнецова',
  'Андрей Новиков', 'Ольга Морозова', 'Сергей Попов', 'Татьяна Лебедева',
  'Игорь Козлов', 'Наталья Смирнова', 'Владимир Волков', 'Юлия Зайцева',
];
const SENDER_ROLES = ['Промоутер', 'Организатор', 'Представитель площадки', 'Концертный агент'];
const ORGANIZATIONS = ['Клуб 16 Тонн', 'ГлавClub', 'VK Stadium', 'Roof Place', 'Известия Hall'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород'];
const FEES = [50000, 75000, 100000, 150000, 200000, 250000, 300000, 500000];

const TEMPLATES = [
  (org: string, city: string, fee: number, date: string, subject: string) =>
    `Здравствуйте! ${org} приглашает ${subject} выступить ${date} в ${city}. Гонорар ${fee.toLocaleString('ru-RU')} ₽.`,
  (org: string, city: string, fee: number, date: string, subject: string) =>
    `Добрый день. ${org} ищет артиста для выступления в ${city} ${date}. Предлагаем ${fee.toLocaleString('ru-RU')} ₽ для ${subject}.`,
];

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function getUnreadCountForUser(userId: string): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*) FROM messages WHERE user_id=$1 AND status='new'`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

// GET /api/messages
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT m.*, b.name AS band_name, s.name AS singer_name
       FROM messages m
       LEFT JOIN band b ON b.id = m.band_id
       LEFT JOIN singer s ON s.id = m.singer_id
       WHERE m.user_id=$1 AND m.status='new'
       ORDER BY m.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/messages/deferred
export async function getDeferredMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT m.*, b.name AS band_name, s.name AS singer_name
       FROM messages m
       LEFT JOIN band b ON b.id = m.band_id
       LEFT JOIN singer s ON s.id = m.singer_id
       WHERE m.user_id=$1 AND m.status='deferred'
       ORDER BY m.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getDeferredMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/messages/recent
export async function getRecentMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT m.id, m.sender_name, m.sender_role, m.organization,
              m.avatar_url, m.message_text, m.status, m.created_at,
              m.band_id, m.singer_id, b.name AS band_name, s.name AS singer_name
       FROM messages m
       LEFT JOIN band b ON b.id = m.band_id
       LEFT JOIN singer s ON s.id = m.singer_id
       WHERE m.user_id=$1 AND m.status='new'
       ORDER BY m.created_at DESC LIMIT 5`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getRecentMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/messages/unread-count
export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const count = await getUnreadCountForUser(req.userId!);
    res.json({ count });
  } catch (err) {
    console.error('[messages] getUnreadCount:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/messages/history
export async function getHistory(req: AuthRequest, res: Response): Promise<void> {
  const { filter = 'all', search = '', sort = 'desc' } = req.query as {
    filter?: string; search?: string; sort?: string;
  };
  const statuses: Record<string, string[]> = {
    all: ['accepted', 'declined'],
    accepted: ['accepted'],
    declined: ['declined'],
  };
  const allowedStatuses = statuses[filter] ?? statuses.all;
  const order = sort === 'asc' ? 'ASC' : 'DESC';
  try {
    const result = await db.query(
      `SELECT m.*, b.name AS band_name, s.name AS singer_name
       FROM messages m
       LEFT JOIN band b ON b.id = m.band_id
       LEFT JOIN singer s ON s.id = m.singer_id
       WHERE m.user_id=$1 AND m.status=ANY($2::text[])
         AND ($3='' OR LOWER(m.sender_name) LIKE LOWER($3)
              OR LOWER(m.organization) LIKE LOWER($3)
              OR LOWER(m.message_text) LIKE LOWER($3))
       ORDER BY m.created_at ${order}`,
      [req.userId, allowedStatuses, search ? `%${search}%` : '']
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getHistory:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/messages/generate
export async function generateMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const bandsResult = await db.query(
      'SELECT id, name FROM band WHERE created_by=$1', [req.userId]
    );
    const singersResult = await db.query(
      'SELECT id, name FROM singer WHERE created_by=$1', [req.userId]
    );

    const bands = bandsResult.rows;
    const singers = singersResult.rows;

    if (bands.length === 0 && singers.length === 0) {
      res.status(400).json({
        error: 'Создайте группу или исполнителя для получения концертных предложений',
      });
      return;
    }

    const count = Math.floor(Math.random() * 4) + 1;
    const created = [];

    for (let i = 0; i < count; i++) {
      const usesBand = bands.length > 0 && (singers.length === 0 || Math.random() > 0.4);
      const subject = usesBand ? randomItem(bands) : randomItem(singers);

      const bandId = usesBand ? subject.id : null;
      const singerId = usesBand ? null : subject.id;

      const name = randomItem(SENDER_NAMES);
      const org = randomItem(ORGANIZATIONS);
      const city = randomItem(CITIES);
      const fee = randomItem(FEES);
      const days = Math.floor(Math.random() * 180) + 14;
      const date = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
      const text = randomItem(TEMPLATES)(
        org, city, fee,
        new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
        subject.name
      );

      const r = await db.query(
        `INSERT INTO messages
           (user_id, sender_name, sender_role, organization, city,
            avatar_url, message_text, proposed_date, proposed_fee, band_id, singer_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [req.userId, name, randomItem(SENDER_ROLES), org, city,
         '', text, date, fee, bandId, singerId]
      );
      created.push(r.rows[0]);

      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1,$2,$3,'info','/messages')`,
        [req.userId, 'Новый концертный запрос',
         `${name} (${org}) — ${city} для "${subject.name}"`]
      );
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('[messages] generateMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/messages/:id/accept
export async function acceptMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const msgResult = await client.query(
      `UPDATE messages SET status='accepted', updated_at=now()
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, req.userId]
    );
    if (msgResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Сообщение не найдено' });
      return;
    }
    const msg = msgResult.rows[0];

    const bandId: string | null = msg.band_id ?? null;
    const singerId: string | null = msg.singer_id ?? null;

    if (!bandId && !singerId) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Сообщение не привязано к группе или исполнителю' });
      return;
    }

    let rating = 5;
    if (bandId) {
      const bandCheck = await client.query(
        'SELECT rating FROM band WHERE id=$1 AND created_by=$2',
        [bandId, req.userId]
      );
      if (bandCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(403).json({ error: 'Группа не найдена' });
        return;
      }
      rating = parseFloat(bandCheck.rows[0]?.rating ?? '5') || 5;
    } else if (singerId) {
      const singerCheck = await client.query(
        'SELECT rating FROM singer WHERE id=$1 AND created_by=$2',
        [singerId, req.userId]
      );
      if (singerCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(403).json({ error: 'Исполнитель не найден' });
        return;
      }
      rating = parseFloat(singerCheck.rows[0]?.rating ?? '5') || 5;
    }

    const basePrice = 1000;
    const cityCoeff = 1.0;
    const avgTicketPrice = Math.round(basePrice * cityCoeff * (rating / 10 + 0.5));

    const tourResult = await client.query(
      `INSERT INTO tour
         (program_name, city, venue, start_date, end_date, avg_ticket_price,
          band_id, singer_id, created_by, fee, city_coefficient, type)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, 'concert') RETURNING *`,
      [
        `Концерт — ${msg.organization}`,
        msg.city,
        msg.organization,
        msg.proposed_date,
        avgTicketPrice,
        bandId || null,
        singerId || null,
        req.userId,
        Number(msg.proposed_fee) || 0,
        cityCoeff,
      ]
    );
    const tour = tourResult.rows[0];

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1,$2,$3,'success','/tours')`,
      [req.userId, 'Запрос принят', `Тур "${msg.organization}" в ${msg.city} создан`]
    );

    const countResult = await client.query(
      'SELECT COUNT(*) FROM messages WHERE user_id=$1 AND status=\'new\'', [req.userId]
    );
    await client.query('COMMIT');
    res.json({ message: msg, tour, unreadCount: parseInt(countResult.rows[0].count) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[messages] acceptMessage:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
}

// POST /api/messages/:id/decline
export async function declineMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE messages SET status='declined', updated_at=now()
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Сообщение не найдено' }); return; }
    const unreadCount = await getUnreadCountForUser(req.userId!);
    res.json({ message: result.rows[0], unreadCount });
  } catch (err) {
    console.error('[messages] declineMessage:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/messages/:id/defer
export async function deferMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE messages SET status='deferred', updated_at=now()
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Сообщение не найдено' }); return; }
    const unreadCount = await getUnreadCountForUser(req.userId!);
    res.json({ message: result.rows[0], unreadCount });
  } catch (err) {
    console.error('[messages] deferMessage:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function autoGenerateForAllUsers(): Promise<void> {
  try {
    const users = await db.query(
      `SELECT id FROM users WHERE role IN ('manager', 'admin') AND is_blocked = false`
    );
    for (const user of users.rows) {
      const bandsResult = await db.query(
        'SELECT id, name FROM band WHERE created_by=$1 LIMIT 5',
        [user.id]
      );
      const singersResult = await db.query(
        'SELECT id, name FROM singer WHERE created_by=$1 LIMIT 5',
        [user.id]
      );
      if (bandsResult.rows.length === 0 && singersResult.rows.length === 0) continue;

      const usesBand = bandsResult.rows.length > 0 && (singersResult.rows.length === 0 || Math.random() > 0.4);
      const subject = usesBand ? randomItem(bandsResult.rows) : randomItem(singersResult.rows);
      const bandId = usesBand ? subject.id : null;
      const singerId = usesBand ? null : subject.id;

      const name = randomItem(SENDER_NAMES);
      const org = randomItem(ORGANIZATIONS);
      const city = randomItem(CITIES);
      const fee = randomItem(FEES);
      const days = Math.floor(Math.random() * 180) + 14;
      const date = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
      const text = randomItem(TEMPLATES)(
        org, city, fee,
        new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
        subject.name
      );

      await db.query(
        `INSERT INTO messages
           (user_id, sender_name, sender_role, organization, city,
            avatar_url, message_text, proposed_date, proposed_fee, band_id, singer_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [user.id, name, randomItem(SENDER_ROLES), org, city,
         '', text, date, fee, bandId, singerId]
      );
    }
  } catch (err) {
    console.error('[messages] autoGenerateForAllUsers:', err);
  }
}
