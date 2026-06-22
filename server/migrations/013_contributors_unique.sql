-- ─── Unique contributor per owner (case-insensitive name + type) ─────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributor_name_type_owner
  ON contributor (LOWER(name), type, created_by);
