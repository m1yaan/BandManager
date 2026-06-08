-- ─── Задача 7: связь песни и исполнителя ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS song_singer (
  song_id    UUID NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  singer_id  UUID NOT NULL REFERENCES singer(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (song_id, singer_id)
);
CREATE INDEX IF NOT EXISTS idx_song_singer_song   ON song_singer(song_id);
CREATE INDEX IF NOT EXISTS idx_song_singer_singer ON song_singer(singer_id);

-- ─── Задача 3: разделение fee и avg_ticket_price ──────────────────────────────
-- fee уже есть (добавлен ранее), avg_ticket_price тоже
-- Добавляем city_coefficient для расчёта
ALTER TABLE tour
  ADD COLUMN IF NOT EXISTS city_coefficient NUMERIC(4,2) DEFAULT 1.0;

-- ─── Задача 8: новый статус DEFERRED вместо SAVED ────────────────────────────
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_status_check;

ALTER TABLE messages
  ADD CONSTRAINT messages_status_check
    CHECK (status IN ('new', 'deferred', 'accepted', 'declined'));

-- Мигрируем старые 'saved' → 'deferred'
UPDATE messages SET status = 'deferred' WHERE status = 'saved';

-- ─── Задача 12: статус райдера на туре ───────────────────────────────────────
ALTER TABLE tour
  ADD COLUMN IF NOT EXISTS rider_status TEXT NOT NULL DEFAULT 'empty'
    CHECK (rider_status IN ('empty', 'partial', 'complete'));

-- ─── Задача 2: индексы для изоляции данных ───────────────────────────────────
-- Убеждаемся что все пользовательские данные имеют created_by
-- (столбцы уже есть из предыдущих миграций, добавляем только индексы)
CREATE INDEX IF NOT EXISTS idx_band_created_by_v2   ON band(created_by);
CREATE INDEX IF NOT EXISTS idx_singer_created_by_v2 ON singer(created_by);
CREATE INDEX IF NOT EXISTS idx_song_created_by_v2   ON song(created_by);
CREATE INDEX IF NOT EXISTS idx_tour_created_by_v2   ON tour(created_by);
