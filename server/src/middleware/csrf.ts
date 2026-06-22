import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const CSRF_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const CSRF_SKIP_PATHS = new Set(['/auth/login', '/auth/register', '/leads']);

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfToken(res: Response): string {
  const token = generateCsrfToken();
  res.cookie('csrf_token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_MAX_AGE,
    path: '/',
  });
  res.setHeader('X-CSRF-Token', token);
  return token;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE'].includes(method)) {
    next();
    return;
  }

  if (CSRF_SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.csrf_token;

  if (
    typeof headerToken !== 'string' ||
    typeof cookieToken !== 'string' ||
    headerToken !== cookieToken
  ) {
    res.status(403).json({ error: 'Недействительный CSRF-токен' });
    return;
  }

  next();
}
