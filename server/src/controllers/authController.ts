import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';
import { setCsrfToken } from '../middleware/csrf';

const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: AUTH_COOKIE_MAX_AGE,
  path: '/',
};

function signToken(userId: string, email: string, role: string): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign({ userId, email, role }, process.env.JWT_SECRET!, options);
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie('auth_token', token, AUTH_COOKIE_OPTIONS);
}

function sendAuthResponse(
  res: Response,
  statusCode: number,
  user: { id: string; email: string; name: string | null; avatar_url: string | null; role: string }
): void {
  const token = signToken(user.id, user.email, user.role ?? 'manager');
  setAuthCookie(res, token);
  setCsrfToken(res);
  res.status(statusCode).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: user.role ?? 'manager',
    },
  });
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, role = 'manager' } = req.body as {
    email?: string; password?: string; role?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'Email и пароль обязательны' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    return;
  }
  const validRole = role === 'artist' ? 'artist' : 'manager';

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email уже используется' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, avatar_url, role, created_at`,
      [email, hash, validRole]
    );

    sendAuthResponse(res, 201, result.rows[0]);
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
      'SELECT id, email, password, name, avatar_url, role FROM users WHERE email = $1',
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

    sendAuthResponse(res, 200, user);
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/auth/logout
export function logout(_req: Request, res: Response): void {
  res.clearCookie('auth_token', AUTH_COOKIE_OPTIONS);
  res.clearCookie('csrf_token', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.json({ success: true });
}

// GET /api/auth/me
export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      'SELECT id, email, name, avatar_url, role, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    res.json({ user: { ...result.rows[0], role: result.rows[0].role ?? 'manager' } });
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
      `UPDATE users SET name=$1, avatar_url=$2
       WHERE id=$3
       RETURNING id, email, name, avatar_url, role, created_at`,
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
