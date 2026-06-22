-- ─── Artist ↔ Manager link ───────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_managed_by ON users (managed_by);
