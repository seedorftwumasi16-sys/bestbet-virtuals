import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, description, badge FROM promotions WHERE is_active = true ORDER BY created_at DESC LIMIT 5'
    );
    if (result.rows.length === 0) {
      return res.json([
        { id: '1', title: 'Welcome Bonus', description: 'Get 10% extra on your first deposit!', badge: 'HOT' },
        { id: '2', title: 'Acca Boost', description: 'Boost your accumulator winnings up to 50%', badge: 'NEW' },
        { id: '3', title: 'Virtual League', description: 'Bet on instant virtuals every 3 minutes', badge: 'LIVE' },
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/winners', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.booking_code, b.potential_win, u.first_name, b.settled_at
       FROM bets b JOIN users u ON b.user_id = u.id
       WHERE b.status = 'won' ORDER BY b.settled_at DESC LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
