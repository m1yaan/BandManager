/**
 * Seed script: create default admin user
 * Run: npm run seed:admin (from server directory)
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const email = 'bandmanager_admin@mail.ru';
  const password = process.env.ADMIN_SEED_PASSWORD?.trim()
    || crypto.randomBytes(16).toString('hex');

  if (!process.env.ADMIN_SEED_PASSWORD?.trim()) {
    console.log('[seed] Admin password:', password);
  }

  const hash = await bcrypt.hash(password, 10);

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    await db.query(
      'UPDATE users SET password = $1, role = $2, name = COALESCE(NULLIF(name, \'\'), $3) WHERE email = $4',
      [hash, 'admin', 'BandManager Admin', email]
    );
    console.log(`[seed] Admin updated: ${email}`);
  } else {
    await db.query(
      `INSERT INTO users (email, password, role, name)
       VALUES ($1, $2, 'admin', 'BandManager Admin')`,
      [email, hash]
    );
    console.log(`[seed] Admin created: ${email}`);
  }

  await db.end();
}

run().catch(err => { console.error(err); process.exit(1); });
