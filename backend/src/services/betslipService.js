import pool from '../db/pool.js';

function generateCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `SB${n}`;
}

export async function saveBetslip(selections, stake = 10, existingCode = null) {
  const code = existingCode || generateCode();
  const payload = JSON.stringify(selections);
  const existing = await pool.query('SELECT id FROM saved_betslips WHERE code = $1', [code]);
  if (existing.rows.length) {
    await pool.query(
      `UPDATE saved_betslips SET selections = $2, stake = $3, expires_at = NOW() + INTERVAL '30 days' WHERE code = $1`,
      [code, payload, stake]
    );
  } else {
    await pool.query(
      `INSERT INTO saved_betslips (code, selections, stake) VALUES ($1, $2, $3)`,
      [code, payload, stake]
    );
  }
  return { code, selections, stake };
}

export async function getBetslipByCode(code) {
  const normalized = code.trim().toUpperCase();
  const res = await pool.query(
    `SELECT code, selections, stake, created_at FROM saved_betslips
     WHERE code = $1 AND expires_at > NOW()`,
    [normalized]
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    code: row.code,
    stake: parseFloat(row.stake),
    selections: typeof row.selections === 'string' ? JSON.parse(row.selections) : row.selections,
    type: 'slip',
  };
}
