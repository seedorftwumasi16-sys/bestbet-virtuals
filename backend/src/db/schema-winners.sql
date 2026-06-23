-- Recent Winners (managed from admin, shown on homepage)

CREATE TABLE IF NOT EXISTS recent_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(120) NOT NULL,
  country VARCHAR(80) DEFAULT 'Ghana',
  username VARCHAR(80),
  winning_amount DECIMAL(15, 2) NOT NULL,
  booking_slip_id VARCHAR(32),
  time_won TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  profile_picture VARCHAR(500),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recent_winners_active ON recent_winners(is_active, is_pinned DESC, time_won DESC);

INSERT INTO system_settings (key, value) VALUES ('winners_auto_rotation', 'true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value) VALUES ('winners_rotation_minutes', '2')
ON CONFLICT (key) DO NOTHING;
