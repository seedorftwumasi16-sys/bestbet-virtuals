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

async function seed() {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash('admin123', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, balance)
       VALUES ($1, $2, 'Admin', 'SkyBet', 'admin', 0)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@skybet.com', hash]
    );
    await client.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, balance)
       VALUES ($1, $2, $3, 'Demo', 'User', 1000)
       ON CONFLICT (email) DO NOTHING`,
      ['demo@skybet.com', '0244123456', hash]
    );
    for (const team of TEAMS) {
      const existing = await client.query('SELECT id FROM teams WHERE name = $1', [team.name]);
      if (existing.rows[0]) continue;
      const res = await client.query(
        'INSERT INTO teams (name, short_name) VALUES ($1, $2) RETURNING id',
        [team.name, team.short]
      );
      await client.query(
        'INSERT INTO league_table (team_id, position) VALUES ($1, $2)',
        [res.rows[0].id, TEAMS.indexOf(team) + 1]
      );
    }
    const settings = [
      { key: 'rtp_percentage', value: '92' },
      { key: 'house_profit_percentage', value: '8' },
      { key: 'automatic_mode', value: 'true' },
      { key: 'manual_mode', value: 'false' },
      { key: 'match_interval_minutes', value: '3' },
      { key: 'currency', value: 'GHS' },
      { key: 'min_deposit', value: '5' },
      { key: 'min_withdrawal', value: '10' },
      { key: 'min_bet', value: '1' },
      { key: 'max_bet', value: '50000' },
    ];
    for (const s of settings) {
      await client.query(
        `INSERT INTO system_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [s.key, s.value]
      );
    }
    console.log('✅ Seed completed');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    if (pool.end) await pool.end();
  }
}

seed();
