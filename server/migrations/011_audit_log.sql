-- ─── Audit log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type  TEXT NOT NULL CHECK (entity_type IN (
    'band', 'singer', 'song', 'tour', 'tour_stop', 'rider_checklist', 'message'
  )),
  entity_id    UUID,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id      ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity_type  ON audit_log (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at   ON audit_log (created_at DESC);
