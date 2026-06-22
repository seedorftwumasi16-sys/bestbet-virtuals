import bcrypt from 'bcryptjs';
import pool from './pool.js';

const TEAMS = [
  { name: 'Accra Lions', short: 'ACL' },
  { name: 'Kumasi Warriors', short: 'KWA' },
  { name: 'Cape Coast Sharks', short: 'CCS' },
  { name: 'Tamale Titans', short: 'TAM' },
  { name: 'Takoradi Eagles', short: 'TAK' },
  { name: 'Ho Hurricanes', short: 'HOH' },
  { name: 'Sunyani Stars', short: 'SUN' },
  { name: 'Bolgatanga Bulls', short: 'BOL' },
  { name: 'Wa Wolves', short: 'WAW' },
  { name: 'Koforidua Kings', short: 'KOF' },
  { name: 'Tema Thunder', short: 'TEM' },
  { name: 'Obuasi Gold', short: 'OBU' },
];

export async function runProductionSeed() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bestbet.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'BestBetAdmin2024!';
  const demoPassword = process.env.DEMO_PASSWORD || 'BestBetDemo2024!';

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const demoHash = await bcrypt.hash(demoPassword, 12);

  const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (!adminExists.rows.length) {
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, balance)
       VALUES ($1, $2, 'Admin', 'BestBet', 'admin', 0)`,
      [adminEmail, adminHash]
    );
    console.log(`✅ Admin created: ${adminEmail}`);
  }

  const demoExists = await pool.query('SELECT id FROM users WHERE email = $1', ['demo@bestbet.com']);
  if (!demoExists.rows.length) {
    await pool.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, balance)
       VALUES ($1, $2, $3, 'Demo', 'User', 1000)`,
      ['demo@bestbet.com', '0244123456', demoHash]
    );
    console.log('✅ Demo user created: demo@bestbet.com');
  }

  for (const team of TEAMS) {
    const existing = await pool.query('SELECT id FROM teams WHERE name = $1', [team.name]);
    if (existing.rows[0]) continue;
    const res = await pool.query(
      'INSERT INTO teams (name, short_name, strength) VALUES ($1, $2, $3) RETURNING id',
      [team.name, team.short, 40 + Math.floor(Math.random() * 30)]
    );
    await pool.query(
      'INSERT INTO league_table (team_id, position) VALUES ($1, $2)',
      [res.rows[0].id, TEAMS.indexOf(team) + 1]
    );
  }

  const settings = [
    { key: 'rtp_percentage', value: '92' },
    { key: 'house_profit_percentage', value: '8' },
    { key: 'automatic_mode', value: 'true' },
    { key: 'manual_mode', value: 'false' },
    { key: 'competition_paused', value: 'false' },
    { key: 'match_interval_minutes', value: '3' },
    { key: 'currency', value: 'GHS' },
    { key: 'min_deposit', value: '5' },
    { key: 'min_withdrawal', value: '10' },
    { key: 'min_bet', value: '1' },
    { key: 'max_bet', value: '50000' },
  ];

  for (const s of settings) {
    await pool.query(
      `INSERT INTO system_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [s.key, s.value]
    );
  }

  const promoCount = await pool.query('SELECT COUNT(*) as c FROM promotions');
  if (parseInt(promoCount.rows[0].c) === 0) {
    await pool.query(
      `INSERT INTO promotions (title, description, badge) VALUES
       ('Welcome Bonus', 'Get 10% extra on your first deposit!', 'HOT'),
       ('Acca Boost', 'Boost accumulator winnings up to 50%', 'NEW'),
       ('Virtual League', 'New matches every 3 minutes', 'LIVE')`
    );
  }

  console.log('✅ Production seed complete');
}
