import pool from '../db/pool.js';

export async function getSetting(key, defaultValue = null) {
  const res = await pool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
  return res.rows[0]?.value ?? defaultValue;
}

export async function getAllSettings() {
  const res = await pool.query('SELECT key, value FROM system_settings');
  const settings = {};
  res.rows.forEach((r) => { settings[r.key] = r.value; });
  return settings;
}

export async function updateSetting(key, value) {
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  );
}
