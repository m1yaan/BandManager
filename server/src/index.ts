import express, { NextFunction, Response } from 'express';

import cors from 'cors';

import cookieParser from 'cookie-parser';

import dotenv from 'dotenv';

import { testConnection } from './db/pool';

import authRoutes from './routes/auth';

import apiRoutes from './routes/api';

import leadsRoutes from './routes/leads';

import { authenticate, AuthRequest } from './middleware/authenticate';

import { csrfProtection } from './middleware/csrf';

import { apiLimiter, loginLimiter, registerLimiter } from './middleware/rateLimiter';

import { getAllowedOrigins, getHelmetMiddleware } from './config/security';



dotenv.config();



const app = express();

const PORT = process.env.PORT ?? 4000;



const PUBLIC_AUTH_PATHS = new Set(['/auth/login', '/auth/register', '/auth/logout', '/leads']);

const allowedOrigins = getAllowedOrigins();



app.use(getHelmetMiddleware());

app.use(cors({

  origin(origin, callback) {

    if (!origin) {

      callback(null, true);

      return;

    }

    if (allowedOrigins.includes(origin)) {

      callback(null, origin);

      return;

    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));

  },

  credentials: true,

  exposedHeaders: ['Content-Disposition'],

}));

app.use(express.json());

app.use(cookieParser());



app.use('/api/auth/login', loginLimiter);

app.use('/api/auth/register', registerLimiter);

app.use('/api', (req, res, next) => {

  if (req.path === '/auth/login' || req.path === '/auth/register') {

    next();

    return;

  }

  apiLimiter(req, res, next);

});

app.use('/api/leads', leadsRoutes);

app.use('/api', (req: AuthRequest, res: Response, next: NextFunction) => {

  if (PUBLIC_AUTH_PATHS.has(req.path)) {

    next();

    return;

  }

  authenticate(req, res, () => {

    if (res.headersSent) return;

    csrfProtection(req, res, next);

  });

});



app.use('/api/auth', authRoutes);

app.use('/api', apiRoutes);



app.get('/health', (_req, res) => {

  res.json({ status: 'ok', timestamp: new Date().toISOString() });

});



app.use((_req, res) => {

  res.status(404).json({ error: 'Маршрут не найден' });

});



async function start() {

  await testConnection();

  app.listen(PORT, () => {

    console.log(`[server] BandManager API → http://localhost:${PORT}`);

  });

}



start().catch(err => {

  console.error('[server] Fatal startup error:', err);

  process.exit(1);

});


