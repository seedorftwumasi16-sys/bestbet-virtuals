import { seedEuropeanFootball } from './seedEuropean.js';

export async function runSeed() {
  const bcrypt = await import('bcryptjs');
  const pool = (await import('./pool.js')).default;

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@skybet.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const demoPassword = process.env.DEMO_PASSWORD || 'SkyBetDemo2024!';
  const adminHash = await bcrypt.default.hash(adminPassword, 12);
  const demoHash = await bcrypt.default.hash(demoPassword, 12);

  const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (!adminExists.rows.length) {
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, balance)
       VALUES ($1, $2, 'Super', 'Admin', 'super_admin', 0)`,
      [adminEmail, adminHash]
    );
    console.log(`✅ Super Admin created: ${adminEmail}`);
  } else {
    await pool.query(
      `UPDATE users SET password_hash = $1, role = 'super_admin', is_suspended = false, is_banned = false, updated_at = NOW()
       WHERE email = $2`,
      [adminHash, adminEmail]
    );
    console.log(`✅ Super Admin ready: ${adminEmail}`);
  }

  const demoExists = await pool.query('SELECT id FROM users WHERE email = $1', ['demo@skybet.com']);
  if (!demoExists.rows.length) {
    await pool.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, balance)
       VALUES ($1, $2, $3, 'Demo', 'User', 1000)`,
      ['demo@skybet.com', '0244123456', demoHash]
    );
  }

  await seedEuropeanFootball(pool, { reset: true });

  const settings = [
    { key: 'rtp_percentage', value: '92' },
    { key: 'house_profit_percentage', value: '8' },
    { key: 'automatic_mode', value: 'true' },
    { key: 'manual_mode', value: 'false' },
    { key: 'match_interval_seconds', value: '120' },
    { key: 'match_interval_minutes', value: '2' },
    { key: 'betting_close_seconds', value: '10' },
    { key: 'currency', value: 'GHS' },
    { key: 'min_deposit', value: '5' },
    { key: 'min_withdrawal', value: '10' },
    { key: 'min_bet', value: '1' },
    { key: 'max_bet', value: '50000' },
    { key: 'current_season', value: String(new Date().getFullYear()) },
    { key: 'prize_pool_base', value: '25000' },
    { key: 'competition_paused', value: 'false' },
  ];

  for (const s of settings) {
    const exists = await pool.query('SELECT id FROM system_settings WHERE key = $1', [s.key]);
    if (!exists.rows.length) {
      await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2)', [s.key, s.value]);
    } else {
      await pool.query('UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2', [s.value, s.key]);
    }
  }

  console.log('✅ Seed data loaded');
}
