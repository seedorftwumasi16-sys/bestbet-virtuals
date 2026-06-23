-- Saved betslips (shareable booking codes before placing bets)

CREATE TABLE IF NOT EXISTS saved_betslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(12) UNIQUE NOT NULL,
  selections JSONB NOT NULL DEFAULT '[]',
  stake DECIMAL(15, 2) DEFAULT 10.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_saved_betslips_code ON saved_betslips(code);

-- Extended live / final match statistics
ALTER TABLE matches ADD COLUMN IF NOT EXISTS xg_home DECIMAL(4, 2) DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS xg_away DECIMAL(4, 2) DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS shots_on_target_home INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS shots_on_target_away INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_minute INT DEFAULT 0;
