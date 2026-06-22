-- ─── Drop legacy text composer/lyricist (use contributor_id FKs) ─────────────
ALTER TABLE song DROP COLUMN IF EXISTS composer;
ALTER TABLE song DROP COLUMN IF EXISTS lyricist;
