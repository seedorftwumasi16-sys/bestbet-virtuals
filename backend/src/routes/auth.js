import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { auditLog } from '../services/auditService.js';

const router = Router();

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, phone, firstName, lastName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, balance`,
      [email, phone, hash, firstName, lastName]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await auditLog(user.id, 'user_registered', 'user', user.id, {}, req.ip);
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.is_banned) return res.status(403).json({ error: 'Account banned' });
    if (user.is_suspended || user.role === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      if (user.id) {
        await pool.query(
          'INSERT INTO login_history (user_id, email, ip_address, user_agent, success) VALUES ($1, $2, $3, $4, false)',
          [user.id, email, req.ip, req.headers['user-agent']]
        );
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({ error: 'Server auth misconfigured' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await auditLog(user.id, 'user_login', 'user', user.id, {}, req.ip);
    await pool.query(
      'INSERT INTO login_history (user_id, email, ip_address, user_agent, success) VALUES ($1, $2, $3, $4, true)',
      [user.id, user.email, req.ip, req.headers['user-agent']]
    );
    res.json({
      user: {
        id: user.id, email: user.email, first_name: user.first_name,
        last_name: user.last_name, role: user.role, balance: user.balance, phone: user.phone,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) return res.json({ message: 'If account exists, reset link sent' });

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [result.rows[0].id, token, expires]
    );

    res.json({ message: 'If account exists, reset link sent', resetToken: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Invalid or expired token' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, result.rows[0].user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [result.rows[0].id]);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, phone, first_name, last_name, role, balance, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
