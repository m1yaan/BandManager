import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

const SENDER_NAMES = [
  'Алексей Иванов', 'Мария Петрова', 'Дмитрий Соколов', 'Елена Кузнецова',
  'Андрей Новиков', 'Ольга Морозова', 'Сергей Попов', 'Татьяна Лебедева',
  'Игорь Козлов', 'Наталья Смирнова', 'Владимир Волков', 'Юлия Зайцева',
  'Павел Семёнов', 'Анна Белова', 'Михаил Орлов', 'Светлана Фёдорова',
];

const SENDER_ROLES = ['Промоутер', 'Организатор', 'Представитель площадки', 'Концертный агент', 'Фестиваль'];
const ORGANIZATIONS = ['Клуб 16 Тонн', 'ГлавClub', 'VK Stadium', 'Roof Place', 'Aglomerat', 'Известия Hall', 'Crocus City Hall', 'Stadium Live', 'Клуб Volta', 'A2 Green Concert'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород', 'Самара', 'Ростов-на-Дону'];
const FEES = [50000, 75000, 100000, 150000, 200000, 250000, 300000, 500000];

const TEMPLATES = [
  (org: string, city: string, fee: number, date: string) =>
    `Здравствуйте! ${org} приглашает вашу группу выступить ${date} в ${city}. Гонорар ${fee.toLocaleString('ru-RU')} ₽.`,
  (org: string, city: string, fee: number, date: string) =>
    `Добрый день. ${org} ищет коллектив на фестиваль в ${city}. Дата: ${date}. Предлагаем ${fee.toLocaleString('ru-RU')} ₽.`,
  (org: string, city: string, fee: number, date: string) =>
    `Есть свободная дата ${date} в ${city}. ${org} заинтересован в сотрудничестве. Гонорар ${fee.toLocaleString('ru-RU')} ₽.`,
];

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateMessage(userId: string) {
  const name = randomItem(SENDER_NAMES);
  const org  = randomItem(ORGANIZATIONS);
  const city = randomItem(CITIES);
  const fee  = randomItem(FEES);
  const days = Math.floor(Math.random() * 180) + 14;
  const date = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
  const text = randomItem(TEMPLATES)(org, city, fee, new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }));
  return { userId, sender_name: name, sender_role: randomItem(SENDER_ROLES), organization: org, city, avatar_url: '', message_text: text, proposed_date: date, proposed_fee: fee };
}

// GET /api/messages — NEW + DEFERRED (Задача 8)
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT * FROM messages WHERE user_id=$1 AND status='new' ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/messages/deferred — отложенные (Задача 8)
export async function getDeferredMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT * FROM messages WHERE user_id=$1 AND status='deferred' ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getDeferredMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/messages/recent — последние 5 NEW для дашборда (Задача 9)
export async function getRecentMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT id, sender_name, sender_role, organization, avatar_url, message_text, status, created_at
       FROM messages
       WHERE user_id=$1 AND status='new'
       ORDER BY created_at DESC
       LIMIT 5`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getRecentMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/messages/unread-count — Задача 5: реальный счётчик
export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT COUNT(*) FROM messages WHERE user_id=$1 AND status='new'`,
      [req.userId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
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
    all:      ['accepted', 'declined'],
    accepted: ['accepted'],
    declined: ['declined'],
  };
  const allowedStatuses = statuses[filter] ?? statuses.all;
  const order = sort === 'asc' ? 'ASC' : 'DESC';
  try {
    const result = await db.query(
      `SELECT * FROM messages
       WHERE user_id=$1 AND status=ANY($2::text[])
         AND ($3='' OR LOWER(sender_name) LIKE LOWER($3) OR LOWER(organization) LIKE LOWER($3) OR LOWER(message_text) LIKE LOWER($3))
       ORDER BY created_at ${order}`,
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
  const count = Math.floor(Math.random() * 4) + 1;
  try {
    const created = [];
    for (let i = 0; i < count; i++) {
      const m = generateMessage(req.userId!);
      const r = await db.query(
        `INSERT INTO messages (user_id, sender_name, sender_role, organization, city, avatar_url, message_text, proposed_date, proposed_fee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [m.userId, m.sender_name, m.sender_role, m.organization, m.city, m.avatar_url, m.message_text, m.proposed_date, m.proposed_fee]
      );
      created.push(r.rows[0]);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,'info','/messages')`,
        [req.userId, 'Новый концертный запрос', `${m.sender_name} (${m.organization}) — ${m.city}`]
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
  const { bandId } = req.body as { bandId?: string };
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const msgResult = await client.query(
      `UPDATE messages SET status='accepted', updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, req.userId]
    );
    if (msgResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Сообщение не найдено' });
      return;
    }
    const msg = msgResult.rows[0];
    let tour = null;
    if (bandId) {
      const tourResult = await client.query(
        `INSERT INTO tour (program_name, city, start_date, end_date, avg_ticket_price, band_id, created_by, fee)
         VALUES ($1, $2, $3, $3, $4, $5, $6, $4) RETURNING *`,
        [`Концерт — ${msg.organization}`, msg.city, msg.proposed_date, msg.proposed_fee, bandId, req.userId]
      );
      tour = tourResult.rows[0];
    }
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,'success','/tours')`,
      [req.userId, 'Запрос принят', `Тур "${msg.organization}" в ${msg.city} добавлен`]
    );
    await client.query('COMMIT');
    res.json({ message: msg, tour });
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
      `UPDATE messages SET status='declined', updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Сообщение не найдено' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[messages] declineMessage:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/messages/:id/defer — Задача 8: DEFERRED вместо SAVED
export async function deferMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE messages SET status='deferred', updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Сообщение не найдено' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[messages] deferMessage:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function autoGenerateForAllUsers(): Promise<void> {
  try {
    const users = await db.query(`SELECT id FROM users WHERE role IN ('manager', 'admin') AND is_blocked = false`);
    for (const user of users.rows) {
      const m = generateMessage(user.id);
      await db.query(
        `INSERT INTO messages (user_id, sender_name, sender_role, organization, city, avatar_url, message_text, proposed_date, proposed_fee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [m.userId, m.sender_name, m.sender_role, m.organization, m.city, m.avatar_url, m.message_text, m.proposed_date, m.proposed_fee]
      );
    }
  } catch (err) {
    console.error('[messages] autoGenerateForAllUsers:', err);
  }
}
