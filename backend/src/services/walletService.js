import pool from '../db/pool.js';

export async function getBalance(userId) {
  const res = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
  return parseFloat(res.rows[0]?.balance || 0);
}

export async function creditAccount(userId, amount, type, reference, description) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const balanceBefore = parseFloat(userRes.rows[0].balance);
    const balanceAfter = balanceBefore + amount;
    await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [balanceAfter, userId]);
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')`,
      [userId, type, amount, balanceBefore, balanceAfter, reference, description]
    );
    await client.query('COMMIT');
    return balanceAfter;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function debitAccount(userId, amount, type, reference, description) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const balanceBefore = parseFloat(userRes.rows[0].balance);
    if (balanceBefore < amount) throw new Error('Insufficient balance');
    const balanceAfter = balanceBefore - amount;
    await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [balanceAfter, userId]);
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')`,
      [userId, type, -amount, balanceBefore, balanceAfter, reference, description]
    );
    await client.query('COMMIT');
    return balanceAfter;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
