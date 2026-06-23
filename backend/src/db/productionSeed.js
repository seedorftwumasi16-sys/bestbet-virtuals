import bcrypt from 'bcryptjs';
import pool from './pool.js';
import { seedEuropeanFootball } from './seedEuropean.js';

export async function runProductionSeed() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@skybet.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const demoPassword = process.env.DEMO_PASSWORD || 'SkyBetDemo2024!';

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const demoHash = await bcrypt.hash(demoPassword, 12);

  const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (!adminExists.rows.length) {
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, balance)
       VALUES ($1, $2, 'Super', 'Admin', 'super_admin', 0)`,
      [adminEmail, adminHash]
    );
    console.log(`✅ Super Admin created: ${adminEmail}`);
  } else if (process.env.NODE_ENV !== 'production' || process.env.ADMIN_RESET_PASSWORD === 'true' || process.env.USE_IN_MEMORY_DB === 'true') {
    await pool.query(
      `UPDATE users SET password_hash = $1, role = 'super_admin', is_suspended = false, is_banned = false, updated_at = NOW()
       WHERE email = $2`,
      [adminHash, adminEmail]
    );
    console.log(`✅ Super Admin refreshed: ${adminEmail} (role: super_admin)`);
  }

  const demoExists = await pool.query('SELECT id FROM users WHERE email = $1', ['demo@skybet.com']);
  if (!demoExists.rows.length) {
    await pool.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, balance)
       VALUES ($1, $2, $3, 'Demo', 'User', 1000)`,
      ['demo@skybet.com', '0244123456', demoHash]
    );
    console.log('✅ Demo user created: demo@skybet.com');
  }

  const teamCount = await pool.query('SELECT COUNT(*) as c FROM teams');
  if (parseInt(teamCount.rows[0].c, 10) < 40) {
    await seedEuropeanFootball(pool, { reset: false });
  }

  const settings = [
    { key: 'rtp_percentage', value: '92' },
    { key: 'house_profit_percentage', value: '8' },
    { key: 'automatic_mode', value: 'true' },
    { key: 'manual_mode', value: 'false' },
    { key: 'competition_paused', value: 'false' },
    { key: 'match_interval_seconds', value: '120' },
    { key: 'match_interval_minutes', value: '2' },
    { key: 'betting_close_seconds', value: '10' },
    { key: 'current_season', value: String(new Date().getFullYear()) },
    { key: 'prize_pool_base', value: '10000' },
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
