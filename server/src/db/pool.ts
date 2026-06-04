import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 30_000,
  max: 10,
});

db.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

export async function testConnection(): Promise<void> {
  const client = await db.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('[DB] Connected to PostgreSQL successfully');
}
