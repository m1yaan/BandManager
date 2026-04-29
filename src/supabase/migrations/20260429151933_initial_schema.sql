
/*
  # BandManager Initial Schema

  ## Summary
  Creates the full BandManager database schema with all required tables, foreign keys, and RLS policies.

  ## New Tables

  1. `band` - Music bands
     - `id` (uuid, pk)
     - `name` (text, not null)
     - `foundation_year` (int)
     - `country` (text)
     - `rating` (numeric 1-10)
     - `created_by` (uuid, fk -> auth.users)

  2. `singer` - Individual singers/musicians
     - `id` (uuid, pk)
     - `name` (text, not null)
     - `created_by` (uuid, fk -> auth.users)

  3. `song` - Songs
     - `id` (uuid, pk)
     - `title` (text, not null)
     - `composer` (text)
     - `lyricist` (text)
     - `creation_year` (int)
     - `created_by` (uuid, fk -> auth.users)

  4. `band_member` - Many-to-many: band <-> singer
     - `band_id` (uuid, fk -> band)
     - `singer_id` (uuid, fk -> singer)

  5. `repertoire` - Many-to-many: band <-> song
     - `band_id` (uuid, fk -> band)
     - `song_id` (uuid, fk -> song)

  6. `tour` - Tours
     - `id` (uuid, pk)
     - `program_name` (text)
     - `city` (text)
     - `start_date` (date)
     - `end_date` (date)
     - `avg_ticket_price` (numeric)
     - `band_id` (uuid, fk -> band)
     - `created_by` (uuid, fk -> auth.users)

  7. `tour_song` - Many-to-many: tour <-> song
     - `tour_id` (uuid, fk -> tour)
     - `song_id` (uuid, fk -> song)

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read all records
  - Only the creator can insert/update/delete their own records
*/

-- band
CREATE TABLE IF NOT EXISTS band (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  foundation_year int,
  country text DEFAULT '',
  rating numeric(3,1) CHECK (rating >= 1 AND rating <= 10),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE band ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bands"
  ON band FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert own bands"
  ON band FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can update own bands"
  ON band FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can delete own bands"
  ON band FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- singer
CREATE TABLE IF NOT EXISTS singer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE singer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view singers"
  ON singer FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert own singers"
  ON singer FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can update own singers"
  ON singer FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can delete own singers"
  ON singer FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- song
CREATE TABLE IF NOT EXISTS song (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  composer text DEFAULT '',
  lyricist text DEFAULT '',
  creation_year int,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE song ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view songs"
  ON song FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert own songs"
  ON song FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can update own songs"
  ON song FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can delete own songs"
  ON song FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- band_member
CREATE TABLE IF NOT EXISTS band_member (
  band_id uuid NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  singer_id uuid NOT NULL REFERENCES singer(id) ON DELETE CASCADE,
  PRIMARY KEY (band_id, singer_id)
);

ALTER TABLE band_member ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view band members"
  ON band_member FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert band members"
  ON band_member FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM band WHERE band.id = band_id AND band.created_by = auth.uid())
  );

CREATE POLICY "Managers can delete band members"
  ON band_member FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM band WHERE band.id = band_id AND band.created_by = auth.uid())
  );

-- repertoire
CREATE TABLE IF NOT EXISTS repertoire (
  band_id uuid NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  PRIMARY KEY (band_id, song_id)
);

ALTER TABLE repertoire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view repertoire"
  ON repertoire FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert repertoire"
  ON repertoire FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM band WHERE band.id = band_id AND band.created_by = auth.uid())
  );

CREATE POLICY "Managers can delete repertoire"
  ON repertoire FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM band WHERE band.id = band_id AND band.created_by = auth.uid())
  );

-- tour
CREATE TABLE IF NOT EXISTS tour (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name text NOT NULL,
  city text DEFAULT '',
  start_date date,
  end_date date,
  avg_ticket_price numeric(10,2) DEFAULT 0,
  band_id uuid NOT NULL REFERENCES band(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tour ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tours"
  ON tour FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert own tours"
  ON tour FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can update own tours"
  ON tour FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can delete own tours"
  ON tour FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- tour_song
CREATE TABLE IF NOT EXISTS tour_song (
  tour_id uuid NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  PRIMARY KEY (tour_id, song_id)
);

ALTER TABLE tour_song ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tour songs"
  ON tour_song FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert tour songs"
  ON tour_song FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tour WHERE tour.id = tour_id AND tour.created_by = auth.uid())
  );

CREATE POLICY "Managers can delete tour songs"
  ON tour_song FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tour WHERE tour.id = tour_id AND tour.created_by = auth.uid())
  );
