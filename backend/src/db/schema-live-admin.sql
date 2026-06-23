-- Live match admin control & preset results

ALTER TABLE matches ADD COLUMN IF NOT EXISTS preset_home_score INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS preset_away_score INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS preset_events JSONB DEFAULT '[]';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS admin_commentary TEXT;

ALTER TABLE bets ADD COLUMN IF NOT EXISTS booking_code_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_matches_status_finished ON matches(status, finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_booking_code ON bets(booking_code);
