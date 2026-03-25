-- Path Pulse — PostgreSQL core (explorer identity, profile, expeditions, GPS samples)
-- Apply: psql "$DATABASE_URL" -f db/schema.sql
-- Or: npm run db:migrate

CREATE TABLE IF NOT EXISTS explorers (
  device_id VARCHAR(128) PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  game_progress JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Idempotent for existing DBs created before game_progress:
ALTER TABLE explorers ADD COLUMN IF NOT EXISTS game_progress JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS explorer_profiles (
  device_id VARCHAR(128) PRIMARY KEY REFERENCES explorers(device_id) ON DELETE CASCADE,
  weight_kg DOUBLE PRECISION,
  height_m DOUBLE PRECISION,
  age SMALLINT,
  is_male BOOLEAN,
  bmi DOUBLE PRECISION,
  body_composition JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expeditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(128) NOT NULL REFERENCES explorers(device_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION,
  surface_key TEXT DEFAULT 'pavement',
  terrain_kcal INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'aborted')),
  CONSTRAINT expeditions_time_ok CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_expeditions_device_started ON expeditions(device_id, started_at DESC);

CREATE TABLE IF NOT EXISTS expedition_points (
  id BIGSERIAL PRIMARY KEY,
  expedition_id UUID NOT NULL REFERENCES expeditions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  alt DOUBLE PRECISION,
  t_ms BIGINT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expedition_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_expedition_points_expedition_seq ON expedition_points(expedition_id, seq);
