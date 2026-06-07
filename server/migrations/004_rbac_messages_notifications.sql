-- ─── RBAC: роль пользователя ──────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'manager'
    CHECK (role IN ('manager', 'artist'));

-- Связь пользователя-артиста с записью в таблице singer
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS artist_singer_id UUID REFERENCES singer(id) ON DELETE SET NULL;

-- Связь пользователей-артистов с группами (отдельно от band_member)
CREATE TABLE IF NOT EXISTS band_user_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  band_id    UUID NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, band_id)
);
CREATE INDEX IF NOT EXISTS idx_band_user_members_user ON band_user_members(user_id);
CREATE INDEX IF NOT EXISTS idx_band_user_members_band ON band_user_members(band_id);

-- ─── Сообщения (Inbox) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name  TEXT NOT NULL,
  sender_role  TEXT NOT NULL DEFAULT 'Промоутер',
  organization TEXT NOT NULL DEFAULT '',
  city         TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT DEFAULT '',
  message_text TEXT NOT NULL,
  proposed_date DATE,
  proposed_fee  NUMERIC(12,2) DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','saved','accepted','declined')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_user_id  ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status   ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created  ON messages(created_at DESC);

-- ─── Уведомления ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info'
               CHECK (type IN ('info','success','warning','error')),
  is_read    BOOLEAN NOT NULL DEFAULT false,
  link       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = false;
