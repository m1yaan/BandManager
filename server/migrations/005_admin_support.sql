-- ─── Роль ADMIN ───────────────────────────────────────────────────────────────
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('manager', 'artist', 'admin'));

-- Блокировка пользователей
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- Назначить ADMIN конкретному пользователю
UPDATE users
SET role = 'admin'
WHERE email = 'mishapetrov_pxrtmaus@mail.ru';

-- ─── Support tickets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  file_url   TEXT DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_status  ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_created ON support_tickets(created_at DESC);
