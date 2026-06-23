-- Simplified schema for pg-mem (in-memory dev)

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) UNIQUE NOT NULL,
  phone varchar(20) UNIQUE,
  password_hash varchar(255) NOT NULL,
  first_name varchar(100),
  last_name varchar(100),
  role varchar(20) DEFAULT 'user',
  balance float DEFAULT 0,
  is_suspended boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  avatar_url varchar(500),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  short_name varchar(10),
  logo_url varchar(500),
  league varchar(100) DEFAULT 'Virtual League',
  is_active boolean DEFAULT true,
  strength int DEFAULT 50,
  color_primary varchar(20) DEFAULT '#00E676',
  color_secondary varchar(20) DEFAULT '#FFD700',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_form (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid REFERENCES teams(id),
  match_id uuid,
  result varchar(1),
  goals_for int DEFAULT 0,
  goals_against int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_table (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid UNIQUE REFERENCES teams(id),
  played int DEFAULT 0,
  won int DEFAULT 0,
  drawn int DEFAULT 0,
  lost int DEFAULT 0,
  goals_for int DEFAULT 0,
  goals_against int DEFAULT 0,
  points int DEFAULT 0,
  position int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_team_id uuid REFERENCES teams(id),
  away_team_id uuid REFERENCES teams(id),
  status varchar(20) DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  home_score int DEFAULT 0,
  away_score int DEFAULT 0,
  half_time_home int DEFAULT 0,
  half_time_away int DEFAULT 0,
  possession_home int DEFAULT 50,
  possession_away int DEFAULT 50,
  shots_home int DEFAULT 0,
  shots_away int DEFAULT 0,
  corners_home int DEFAULT 0,
  corners_away int DEFAULT 0,
  yellow_cards_home int DEFAULT 0,
  yellow_cards_away int DEFAULT 0,
  red_cards_home int DEFAULT 0,
  red_cards_away int DEFAULT 0,
  fouls_home int DEFAULT 0,
  fouls_away int DEFAULT 0,
  first_goal_team_id uuid REFERENCES teams(id),
  last_goal_team_id uuid REFERENCES teams(id),
  first_goal_scorer varchar(100),
  commentary text,
  is_manual boolean DEFAULT false,
  manual_mode boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  is_paused boolean DEFAULT false,
  match_number int,
  league_id uuid,
  season_id uuid,
  tournament_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid REFERENCES matches(id),
  event_type varchar(20) NOT NULL,
  team_id uuid REFERENCES teams(id),
  minute int NOT NULL,
  player_name varchar(100),
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_odds (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid REFERENCES matches(id),
  market varchar(50) NOT NULL,
  selection varchar(100) NOT NULL,
  odds float NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  booking_code varchar(20) UNIQUE,
  stake float NOT NULL,
  potential_win float NOT NULL,
  total_odds float NOT NULL,
  status varchar(20) DEFAULT 'pending',
  settled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bet_selections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id uuid REFERENCES bets(id),
  match_id uuid REFERENCES matches(id),
  market varchar(50) NOT NULL,
  selection varchar(100) NOT NULL,
  odds float NOT NULL,
  status varchar(20) DEFAULT 'pending',
  home_team varchar(100),
  away_team varchar(100),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  type varchar(30) NOT NULL,
  amount float NOT NULL,
  balance_before float,
  balance_after float,
  reference varchar(100),
  description text,
  status varchar(20) DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deposit_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  amount float NOT NULL,
  payment_method varchar(30),
  phone_number varchar(20),
  screenshot_url varchar(500),
  status varchar(20) DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  amount float NOT NULL,
  payment_method varchar(30),
  phone_number varchar(20) NOT NULL,
  status varchar(20) DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key varchar(100) UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  action varchar(100) NOT NULL,
  entity_type varchar(50),
  entity_id uuid,
  details text,
  ip_address varchar(45),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  token varchar(255) NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  type varchar(50) NOT NULL,
  title varchar(200) NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title varchar(200) NOT NULL,
  description text,
  image_url varchar(500),
  badge varchar(50),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  email varchar(255),
  ip_address varchar(45),
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  code varchar(20),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id uuid REFERENCES leagues(id),
  name varchar(100) NOT NULL,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  league_id uuid REFERENCES leagues(id),
  season_id uuid REFERENCES seasons(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_banners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title varchar(200) NOT NULL,
  subtitle text,
  image_url varchar(500),
  link_url varchar(500),
  badge varchar(50),
  position int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title varchar(200) NOT NULL,
  message text NOT NULL,
  audience varchar(30) DEFAULT 'all',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
