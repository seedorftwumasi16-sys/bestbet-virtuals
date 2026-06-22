export async function runSeed() {
  const bcrypt = await import('bcryptjs');
  const pool = (await import('./pool.js')).default;

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

  const hash = await bcrypt.default.hash('admin123', 12);

  const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@bestbet.com']);
  if (!adminExists.rows.length) {
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, balance)
       VALUES ($1, $2, 'Admin', 'User', 'admin', 0)`,
      ['admin@bestbet.com', hash]
    );
  }

  const demoExists = await pool.query('SELECT id FROM users WHERE email = $1', ['demo@bestbet.com']);
  if (!demoExists.rows.length) {
    await pool.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, balance)
       VALUES ($1, $2, $3, 'Demo', 'User', 1000)`,
      ['demo@bestbet.com', '0244123456', hash]
    );
  }

  for (const team of TEAMS) {
    const existing = await pool.query('SELECT id FROM teams WHERE name = $1', [team.name]);
    if (existing.rows[0]) continue;
    const res = await pool.query(
      'INSERT INTO teams (name, short_name) VALUES ($1, $2) RETURNING id',
      [team.name, team.short]
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
    { key: 'match_interval_minutes', value: '3' },
    { key: 'currency', value: 'GHS' },
    { key: 'min_deposit', value: '5' },
    { key: 'min_withdrawal', value: '10' },
    { key: 'min_bet', value: '1' },
    { key: 'max_bet', value: '50000' },
  ];

  for (const s of settings) {
    const exists = await pool.query('SELECT id FROM system_settings WHERE key = $1', [s.key]);
    if (!exists.rows.length) {
      await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2)', [s.key, s.value]);
    }
  }

  console.log('✅ Seed data loaded');
}
