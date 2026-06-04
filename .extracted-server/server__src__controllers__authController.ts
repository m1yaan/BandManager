import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

function signToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  );
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email и пароль обязательны' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    return;
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email уже используется' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, name, avatar_url, created_at',
      [email, hash]
    );

    const user = result.rows[0];
    const token = signToken(user.id, user.email);
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url } });
  } catch (err) {
    console.error('[auth] register error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email и пароль обязательны' });
    return;
  }

  try {
    const result = await db.query(
      'SELECT id, email, password, name, avatar_url FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const token = signToken(user.id, user.email);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url } });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/auth/me
export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[auth] me error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// PUT /api/auth/profile
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const { name, avatar_url } = req.body as { name?: string; avatar_url?: string };

  try {
    const result = await db.query(
      'UPDATE users SET name=$1, avatar_url=$2 WHERE id=$3 RETURNING id, email, name, avatar_url, created_at',
      [name?.trim() ?? '', avatar_url?.trim() ?? '', req.userId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[auth] updateProfile error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
```

**Файл: