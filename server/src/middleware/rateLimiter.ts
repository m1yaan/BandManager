import { rateLimit, MemoryStore, AugmentedRequest } from 'express-rate-limit';

const RATE_LIMIT_MESSAGE = 'Слишком много попыток. Попробуйте позже.';

function createLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    limit: max,
    store: new MemoryStore(),
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req, res, _next, _options) => {
      const resetTime = (req as AugmentedRequest).rateLimit?.resetTime;
      if (resetTime instanceof Date) {
        const retryAfter = Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
      }
      res.status(429).json({ error: RATE_LIMIT_MESSAGE });
    },
  });
}

/** 5 попыток за 15 минут — /api/auth/login */
export const loginLimiter = createLimiter(15 * 60 * 1000, 5);

/** 10 попыток за час — /api/auth/register */
export const registerLimiter = createLimiter(60 * 60 * 1000, 10);

/** 100 запросов за 15 минут — остальные /api/* */
export const apiLimiter = createLimiter(15 * 60 * 1000, 100);
