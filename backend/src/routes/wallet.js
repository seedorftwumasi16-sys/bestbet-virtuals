import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, requireActiveUser } from '../middleware/auth.js';
import pool from '../db/pool.js';
import { getBalance } from '../services/walletService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `deposit-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.get('/balance', authenticate, async (req, res) => {
  try {
    const balance = await getBalance(req.user.id);
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposit', authenticate, requireActiveUser, upload.single('screenshot'), async (req, res) => {
  try {
    const { amount, paymentMethod, phoneNumber } = req.body;
    const screenshotUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO deposit_requests (user_id, amount, payment_method, phone_number, screenshot_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, parseFloat(amount), paymentMethod, phoneNumber, screenshotUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deposits', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM deposit_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/withdraw', authenticate, requireActiveUser, async (req, res) => {
  try {
    const { amount, paymentMethod, phoneNumber } = req.body;
    const balance = await getBalance(req.user.id);
    if (balance < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance' });

    const result = await pool.query(
      `INSERT INTO withdrawal_requests (user_id, amount, payment_method, phone_number)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, parseFloat(amount), paymentMethod, phoneNumber]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/withdrawals', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM withdrawal_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
