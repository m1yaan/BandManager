import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

const SENDER_NAMES = [
  'Алексей Иванов', 'Мария Петрова', 'Дмитрий Соколов', 'Елена Кузнецова',
  'Андрей Новиков', 'Ольга Морозова', 'Сергей Попов', 'Татьяна Лебедева',
  'Игорь Козлов', 'Наталья Смирнова', 'Владимир Волков', 'Юлия Зайцева',
  'Павел Семёнов', 'Анна Белова', 'Михаил Орлов', 'Светлана Фёдорова',
  'Роман Васильев', 'Ксения Михайлова', 'Артём Захаров', 'Людмила Соловьёва',
];

const SENDER_ROLES = [
  'Промоутер', 'Организатор', 'Представитель площадки',
  'Концертный агент', 'Фестиваль',
];

const ORGANIZATIONS = [
  'Клуб 16 Тонн', 'ГлавClub', 'VK Stadium', 'Roof Place', 'Aglomerat',
  'Известия Hall', 'Crocus City Hall', 'Мегаспорт', 'Олимпийский',
  'Stadium Live', 'Клуб Volta', 'A2 Green Concert', 'Космонавт',
  'Зал Чайковского', 'Барвиха Luxury Village', 'Ray Just Arena',
  'Фестиваль Нашествие', 'Пикник Афиши', 'Дикая Мята', 'Park Live',
  'Боль Фест', 'Stereoleto', 'Ural Music Night', 'Арт-Овраг',
];

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Ростов-на-Дону', 'Уфа',
  'Красноярск', 'Пермь', 'Воронеж', 'Волгоград', 'Сочи', 'Краснодар',
  'Тюмень', 'Иркутск', 'Хабаровск', 'Владивосток', 'Минск', 'Алматы',
];

const FEES = [50000, 75000, 100000, 150000, 200000, 250000, 300000, 500000, 750000, 1000000];

const MESSAGE_TEMPLATES = [
  (org: string, city: string, fee: number, date: string) =>
    `Здравствуйте! Мы представляем ${org}. Хотим пригласить вашу группу выступить ${date} в ${city}. Гонорар ${fee.toLocaleString('ru-RU')} ₽. Ждём вашего ответа!`,
  (org: string, city: string, fee: number, date: string) =>
    `Добрый день. ${org} ищет коллектив на городской фестиваль в ${city}. Дата: ${date}. Предлагаем ${fee.toLocaleString('ru-RU')} ₽. Рассмотрите наше предложение?`,
  (org: string, city: string, fee: number, date: string) =>
    `Приветствую! ${org} приглашает вас выступить в ${city}. Планируемая дата — ${date}. Обсуждаемый гонорар: ${fee.toLocaleString('ru-RU')} ₽. Готовы обсудить детали.`,
  (org: string, city: string, fee: number, date: string) =>
    `Уважаемые коллеги, мы — команда ${org}. Есть возможность выступить на нашей площадке в ${city} ${date}. Бюджет: ${fee.toLocaleString('ru-RU')} ₽.`,
  (org: string, city: string, fee: number, date: string) =>
    `Есть свободная дата ${date} в ${city}. ${org} заинтересован в сотрудничестве. Гонорар ${fee.toLocaleString('ru-RU')} ₽. Рассмотрите, пожалуйста!`,
  (org: string, city: string, fee: number, date: string) =>
    `Мы проводим ежегодный фестиваль в ${city}. ${org} хотел бы видеть вас в лайнапе. Дата: ${date}. Ставка: ${fee.toLocaleString('ru-RU')} ₽.`,
  (org: string, city: string, fee: number, date: string) =>
    `Здравствуйте. Клуб ${org} в ${city} ищет хедлайнера на ${date}. Предлагаем ${fee.toLocaleString('ru-RU')} ₽ + технический райдер. Будем рады обсудить.`,
  (org: string, city: string, fee: number, date: string) =>
    `Представители ${org} приветствуют вас! Планируем большое мероприятие в ${city} на ${date}. Ваш гонорар составит ${fee.toLocaleString('ru-RU')} ₽.`,
  (org: string, city: string, fee: number, date: string) =>
    `${org} приглашает вас на корпоративное мероприятие в ${city}. Дата: ${date}. Все расходы + гонорар ${fee.toLocaleString('ru-RU')} ₽.`,
  (org: string, city: string, fee: number, date: string) =>
    `Здравствуйте! Мы организуем open-air в ${city} ${date}. Хотим пригласить вас выступить. Гонорар ${fee.toLocaleString('ru-RU')} ₽ + проживание и перелёт.`,
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomDate(): string {
  const days = Math.floor(Math.random() * 180) + 14;
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split('T')[0];
}

function generateMessage(userId: string) {
  const name = randomItem(SENDER_NAMES);
  const role = randomItem(SENDER_ROLES);
  const org = randomItem(ORGANIZATIONS);
  const city = randomItem(CITIES);
  const fee = randomItem(FEES);
  const date = generateRandomDate();
  const tmpl = randomItem(MESSAGE_TEMPLATES);
  const text = tmpl(org, city, fee, new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }));

  return {
    userId, sender_name: name, sender_role: role, organization: org, city,
    avatar_url: '', message_text: text, proposed_date: date, proposed_fee: fee,
  };
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT * FROM messages
       WHERE user_id = $1 AND status IN ('new', 'saved')
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function getHistory(req: AuthRequest, res: Response): Promise<void> {
  const { filter = 'all', search = '', sort = 'desc' } = req.query as {
    filter?: string; search?: string; sort?: string;
  };

  const statuses: Record<string, string[]> = {
    all: ['accepted', 'declined', 'saved'],
    accepted: ['accepted'],
    declined: ['declined'],
    saved: ['saved'],
  };
  const allowedStatuses = statuses[filter] ?? statuses.all;
  const order = sort === 'asc' ? 'ASC' : 'DESC';

  try {
    const result = await db.query(
      `SELECT * FROM messages
       WHERE user_id = $1
         AND status = ANY($2::text[])
         AND (
           $3 = '' OR
           LOWER(sender_name) LIKE LOWER($3) OR
           LOWER(organization) LIKE LOWER($3) OR
           LOWER(message_text) LIKE LOWER($3)
         )
       ORDER BY created_at ${order}`,
      [req.userId, allowedStatuses, search ? `%${search}%` : '']
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[messages] getHistory:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function generateMessages(req: AuthRequest, res: Response): Promise<void> {
  const count = Math.floor(Math.random() * 4) + 1;
  try {
    const created = [];
    for (let i = 0; i < count; i++) {
      const m = generateMessage(req.userId!);
      const r = await db.query(
        `INSERT INTO messages
           (user_id, sender_name, sender_role, organization, city, avatar_url, message_text, proposed_date, proposed_fee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [m.userId, m.sender_name, m.sender_role, m.organization, m.city,
          m.avatar_url, m.message_text, m.proposed_date, m.proposed_fee]
      );
      created.push(r.rows[0]);

      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, $2, $3, 'info', '/messages')`,
        [req.userId, 'Новый концертный запрос',
          `${m.sender_name} (${m.organization}) — ${m.city}`]
      );
    }
    res.status(201).json(created);
  } catch (err) {
    console.error('[messages] generateMessages:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function acceptMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { bandId } = req.body as { bandId?: string };

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

    let tour = null;
    if (bandId) {
      const tourResult = await client.query(
        `INSERT INTO tour (program_name, city, start_date, end_date, avg_ticket_price, band_id, created_by, fee)
         VALUES ($1, $2, $3, $3, 0, $4, $5, $6) RETURNING *`,
        [
          `Концерт — ${msg.organization}`,
          msg.city,
          msg.proposed_date,
          bandId,
          req.userId,
          msg.proposed_fee,
        ]
      );
      tour = tourResult.rows[0];
    }

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, 'success', '/tours')`,
      [req.userId, 'Запрос принят',
        `Тур "${msg.organization}" в ${msg.city} добавлен в расписание`]
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

export async function declineMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE messages SET status='declined', updated_at=now()
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Сообщение не найдено' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[messages] declineMessage:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function saveMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE messages SET status='saved', updated_at=now()
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Сообщение не найдено' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[messages] saveMessage:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function autoGenerateForAllUsers(): Promise<void> {
  try {
    const users = await db.query(`SELECT id FROM users WHERE role = 'manager'`);
    for (const user of users.rows) {
      const m = generateMessage(user.id);
      await db.query(
        `INSERT INTO messages
           (user_id, sender_name, sender_role, organization, city, avatar_url, message_text, proposed_date, proposed_fee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [m.userId, m.sender_name, m.sender_role, m.organization, m.city,
          m.avatar_url, m.message_text, m.proposed_date, m.proposed_fee]
      );
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, $2, $3, 'info', '/messages')`,
        [user.id, 'Новый концертный запрос',
          `${m.sender_name} (${m.organization}) — ${m.city}`]
      );
    }
  } catch (err) {
    console.error('[messages] autoGenerateForAllUsers:', err);
  }
}
