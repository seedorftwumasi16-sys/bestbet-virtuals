import { Router } from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth.js';
import { betLimiter } from '../middleware/rateLimit.js';
import {
  placeBet,
  getUserBets,
  getUserBetsSummary,
  getBetDetails,
  getBetByBookingCode,
} from '../services/bettingService.js';
import { saveBetslip, getBetslipByCode } from '../services/betslipService.js';

const router = Router();

router.post('/slip', async (req, res) => {
  try {
    const { selections, stake, code } = req.body;
    if (!Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ error: 'Selections required' });
    }
    const result = await saveBetslip(selections, parseFloat(stake) || 10, code || null);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/slip/:code', async (req, res) => {
  try {
    const slip = await getBetslipByCode(req.params.code);
    if (!slip) return res.status(404).json({ error: 'Booking code not found' });
    res.json(slip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const bets = await getUserBets(req.user.id, {
      limit: parseInt(req.query.limit || '100', 10),
      status: req.query.status || 'all',
    });
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    res.json(await getUserBetsSummary(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/booking/:code', async (req, res) => {
  try {
    const slip = await getBetslipByCode(req.params.code);
    if (slip) return res.json({ type: 'slip', ...slip });
    const result = await getBetByBookingCode(req.params.code);
    if (!result) return res.status(404).json({ error: 'Booking code not found' });
    res.json({ type: 'bet', ...result });
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

export default router;
