-- BandManager Migration 009 — Tour vs Concert separation

ALTER TABLE tour
  ADD COLUMN IF NOT EXISTS type  TEXT DEFAULT 'concert' CHECK (type IN ('tour', 'concert')),
  ADD COLUMN IF NOT EXISTS venue TEXT DEFAULT '';

-- Существующие записи с остановками — туры, остальные — концерты
UPDATE tour SET type = 'tour'
WHERE id IN (SELECT DISTINCT tour_id FROM tour_stops);

UPDATE tour SET type = 'concert' WHERE type IS NULL;

ALTER TABLE tour_stops
  ADD COLUMN IF NOT EXISTS venue TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_tour_type ON tour(type);
