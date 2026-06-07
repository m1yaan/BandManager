import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db/pool';
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({
  origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

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
