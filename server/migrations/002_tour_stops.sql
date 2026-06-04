-- Остановки тура (мультигород)
ALTER TABLE tour
  ADD COLUMN IF NOT EXISTS fee              NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_percent      NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_commission_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_diem         NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hotel            NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_expenses   NUMERIC(12,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS tour_stops (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id          UUID NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  city             TEXT NOT NULL DEFAULT '',
  event_date       DATE,
  avg_ticket_price NUMERIC(10,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_stops_tour_id ON tour_stops(tour_id);

CREATE TABLE IF NOT EXISTS rider_checklist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id    UUID NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  item_name  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','confirmed','problem')),
  photo_url  TEXT DEFAULT '',
  note       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rider_tour_id ON rider_checklist(tour_id);
