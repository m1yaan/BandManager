import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.auth_token;
  if (!token) {
    res.status(401).json({ error: 'Токен не предоставлен' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: string;
    };
    req.userId    = payload.userId;
    req.userEmail = payload.email;
    req.userRole  = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный или просроченный токен' });
  }
}

/** @deprecated use authenticate */
export const authMiddleware = authenticate;

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }
    next();
  };
}

export function requireManager(req: AuthRequest, res: Response, next: NextFunction): void {
  const allowed = ['manager', 'admin'];
  if (!req.userRole || !allowed.includes(req.userRole)) {
    res.status(403).json({ error: 'Доступ только для менеджеров' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Доступ только для администраторов' });
    return;
  }
  next();
}
