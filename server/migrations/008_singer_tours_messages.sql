-- ─── singer_id в tour (Задача 2) ──────────────────────────────────────────────
ALTER TABLE tour
  ADD COLUMN IF NOT EXISTS singer_id UUID REFERENCES singer(id) ON DELETE SET NULL;

-- Убрать NOT NULL с band_id если он был
ALTER TABLE tour
  ALTER COLUMN band_id DROP NOT NULL;

-- CHECK: хотя бы одно поле заполнено
ALTER TABLE tour
  DROP CONSTRAINT IF EXISTS tour_owner_check;

ALTER TABLE tour
  ADD CONSTRAINT tour_owner_check
    CHECK (band_id IS NOT NULL OR singer_id IS NOT NULL);

-- Запрет одновременного заполнения обоих
ALTER TABLE tour
  DROP CONSTRAINT IF EXISTS tour_owner_exclusive;

ALTER TABLE tour
  ADD CONSTRAINT tour_owner_exclusive
    CHECK (NOT (band_id IS NOT NULL AND singer_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_tour_singer_id ON tour(singer_id);

-- ─── singer_id в messages (Задача 7) ─────────────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS singer_id UUID REFERENCES singer(id) ON DELETE SET NULL;

-- Проверяем что band_id уже есть (из 007)
-- Добавляем CHECK: хотя бы одно заполнено
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_owner_check;

ALTER TABLE messages
  ADD CONSTRAINT messages_owner_check
    CHECK (band_id IS NOT NULL OR singer_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_messages_singer_id ON messages(singer_id);

-- ─── Индекс для singer bands (Задача 2: агрегация) ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_band_member_singer ON band_member(singer_id);
