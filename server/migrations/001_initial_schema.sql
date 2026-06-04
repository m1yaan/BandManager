-- BandManager — Initial Schema
-- This file runs automatically when the postgres container starts for the first time.

-- Users (replaces Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Bands
CREATE TABLE IF NOT EXISTS band (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  foundation_year  INT,
  country          TEXT DEFAULT '',
  rating           NUMERIC(3,1) CHECK (rating >= 1 AND rating <= 10),
  created_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Singers / Artists
CREATE TABLE IF NOT EXISTS singer (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Songs
CREATE TABLE IF NOT EXISTS song (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  composer       TEXT DEFAULT '',
  lyricist       TEXT DEFAULT '',
  creation_year  INT,
  created_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Band <-> Singer (many-to-many)
CREATE TABLE IF NOT EXISTS band_member (
  band_id    UUID NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  singer_id  UUID NOT NULL REFERENCES singer(id) ON DELETE CASCADE,
  PRIMARY KEY (band_id, singer_id)
);

-- Band <-> Song repertoire (many-to-many)
CREATE TABLE IF NOT EXISTS repertoire (
  band_id  UUID NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  song_id  UUID NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  PRIMARY KEY (band_id, song_id)
);

-- Tours
CREATE TABLE IF NOT EXISTS tour (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name     TEXT NOT NULL,
  city             TEXT DEFAULT '',
  start_date       DATE,
  end_date         DATE,
  avg_ticket_price NUMERIC(10,2) DEFAULT 0,
  band_id          UUID NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Tour <-> Song setlist (many-to-many)
CREATE TABLE IF NOT EXISTS tour_song (
  tour_id  UUID NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  song_id  UUID NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  PRIMARY KEY (tour_id, song_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_band_created_by   ON band(created_by);
CREATE INDEX IF NOT EXISTS idx_singer_created_by ON singer(created_by);
CREATE INDEX IF NOT EXISTS idx_song_created_by   ON song(created_by);
CREATE INDEX IF NOT EXISTS idx_tour_created_by   ON tour(created_by);
CREATE INDEX IF NOT EXISTS idx_tour_band_id      ON tour(band_id);
