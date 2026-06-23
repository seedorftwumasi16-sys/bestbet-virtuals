-- Players, team ratings, season fixtures (safe to re-run)

ALTER TABLE teams ADD COLUMN IF NOT EXISTS star_rating INT DEFAULT 3 CHECK (star_rating BETWEEN 1 AND 5);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS attack_rating INT DEFAULT 50;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS midfield_rating INT DEFAULT 50;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS defense_rating INT DEFAULT 50;

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  position VARCHAR(12) DEFAULT 'MID',
  shirt_number INT,
  star_rating INT DEFAULT 3 CHECK (star_rating BETWEEN 1 AND 5),
  is_striker BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  goals_season INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_active ON players(team_id, is_active);

CREATE TABLE IF NOT EXISTS season_fixtures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  matchday INT DEFAULT 1,
  is_played BOOLEAN DEFAULT FALSE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  scheduled_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_fixtures_pending ON season_fixtures(league_id, is_played, scheduled_order);
