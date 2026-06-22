import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import pool from '../db/pool.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, phone, first_name, last_name, role, balance, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const result = await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id, email, phone, first_name, last_name, balance, avatar_url`,
      [firstName, lastName, phone, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
