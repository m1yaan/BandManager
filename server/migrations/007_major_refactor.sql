-- BandManager Migration 007 — Major Refactor
-- Задачи: 1,2,4,5,8,9,11,13,14

-- ─── Contributors ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributor (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'BOTH'
               CHECK (type IN ('COMPOSER', 'LYRICIST', 'BOTH')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contributor_created_by ON contributor(created_by);
CREATE INDEX IF NOT EXISTS idx_contributor_name ON contributor(LOWER(name));

-- ─── Singer расширение ────────────────────────────────────────────────────────
ALTER TABLE singer
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating  NUMERIC(3,1) CHECK (rating >= 1 AND rating <= 10),
  ADD COLUMN IF NOT EXISTS bio     TEXT DEFAULT '';

-- ─── Song: contributor FK + release_date ──────────────────────────────────────
ALTER TABLE song
  ADD COLUMN IF NOT EXISTS composer_id UUID REFERENCES contributor(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lyricist_id UUID REFERENCES contributor(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS release_date DATE;

UPDATE song
  SET release_date = MAKE_DATE(LEAST(GREATEST(creation_year, 1000), 9999), 1, 1)
WHERE creation_year IS NOT NULL AND release_date IS NULL;

-- ─── song_band ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS song_band (
  song_id  UUID NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  band_id  UUID NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  PRIMARY KEY (song_id, band_id)
);
CREATE INDEX IF NOT EXISTS idx_song_band_song ON song_band(song_id);
CREATE INDEX IF NOT EXISTS idx_song_band_band ON song_band(band_id);

-- ─── Messages: band_id ────────────────────────────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS band_id UUID REFERENCES band(id) ON DELETE SET NULL;

-- ─── Tour: city_coefficient, base_ticket_price, nullable band_id ────────────
ALTER TABLE tour
  ADD COLUMN IF NOT EXISTS city_coefficient NUMERIC(4,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS base_ticket_price NUMERIC(10,2) DEFAULT 1000;

ALTER TABLE tour ALTER COLUMN band_id DROP NOT NULL;

-- ─── Tour_stops: avg_ticket_price → ticket_price (Задача 13) ─────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tour_stops' AND column_name = 'avg_ticket_price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tour_stops' AND column_name = 'ticket_price'
  ) THEN
    ALTER TABLE tour_stops RENAME COLUMN avg_ticket_price TO ticket_price;
  END IF;
END $$;

-- Admin создаётся скриптом server/scripts/createAdmin.ts
