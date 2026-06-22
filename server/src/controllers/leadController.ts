import { Request, Response } from 'express';
import { db } from '../db/pool';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/leads
export async function createLead(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string };

  if (!email || !EMAIL_RE.test(email.trim())) {
    res.status(400).json({ error: 'Некорректный email' });
    return;
  }

  const normalized = email.trim().toLowerCase();

  try {
    await db.query(
      `INSERT INTO leads (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [normalized]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[leads] createLead:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
