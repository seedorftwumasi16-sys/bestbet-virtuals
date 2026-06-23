/**
 * Admin bet management routes — mounted from admin.js
 */
import { Router } from 'express';
import pool from '../db/pool.js';
import { auditLog } from '../services/auditService.js';
import {
  getAllBetsAdmin,
  getBetByBookingCode,
  getBetDetails,
  manuallySettleBet,
  voidBet,
} from '../services/bettingService.js';

const router = Router();

router.get('/bets', async (req, res) => {
  try {
    const { bookingCode, code } = req.query;
    const bets = await getAllBetsAdmin({ bookingCode: bookingCode || code, limit: 200 });
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bets/stats/winnings', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.email, u.first_name, u.last_name,
              COUNT(b.id)::int AS won_bets,
              COALESCE(SUM(b.potential_win), 0) AS total_won
       FROM bets b JOIN users u ON b.user_id = u.id
       WHERE b.status = 'won'
       GROUP BY u.id, u.email, u.first_name, u.last_name
       ORDER BY total_won DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bets/booking/:code', async (req, res) => {
  try {
    const result = await getBetByBookingCode(req.params.code);
    if (!result?.bet) return res.status(404).json({ error: 'Bet not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bets/:id', async (req, res) => {
  try {
    const details = await getBetDetails(req.params.id);
    if (!details.bet) return res.status(404).json({ error: 'Bet not found' });
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/bets/:id/void', async (req, res) => {
  try {
    await voidBet(req.params.id);
    await auditLog(req.user.id, 'bet_voided', 'bet', req.params.id, {}, req.ip);
    res.json({ message: 'Bet voided' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/bets/:id/settle', async (req, res) => {
  try {
    const { outcome } = req.body;
    if (!['won', 'lost'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be won or lost' });
    }
    const result = await manuallySettleBet(req.params.id, outcome);
    await auditLog(req.user.id, 'bet_settled', 'bet', req.params.id, { outcome }, req.ip);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
