import { Router } from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth.js';
import { betLimiter } from '../middleware/rateLimit.js';
import { placeBet, getUserBets, getBetDetails, getBetByBookingCode } from '../services/bettingService.js';

const router = Router();

router.post('/place', authenticate, requireActiveUser, betLimiter, async (req, res) => {
  try {
    const { selections, stake } = req.body;
    const result = await placeBet(req.user.id, selections, parseFloat(stake));
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const bets = await getUserBets(req.user.id, parseInt(req.query.limit || '50'));
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const details = await getBetDetails(req.params.id);
    if (!details.bet || details.bet.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Bet not found' });
    }
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/booking/:code', async (req, res) => {
  try {
    const result = await getBetByBookingCode(req.params.code);
    if (!result) return res.status(404).json({ error: 'Booking code not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
