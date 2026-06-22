import { Router } from 'express';
import {
  getUpcomingMatches,
  getLiveMatches,
  getRecentResults,
  getMatchWithDetails,
} from '../services/matchEngine.js';
import pool from '../db/pool.js';

const router = Router();

router.get('/upcoming', async (req, res) => {
  try {
    const matches = await getUpcomingMatches();
    const withOdds = await Promise.all(
      matches.map(async (m) => {
        const odds = await pool.query('SELECT market, selection, odds FROM match_odds WHERE match_id = $1 AND is_active = TRUE', [m.id]);
        return { ...m, odds: odds.rows };
      })
    );
    res.json(withOdds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/live', async (req, res) => {
  try {
    res.json(await getLiveMatches());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    res.json(await getRecentResults());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/league-table', async (req, res) => {
  try {
    const res2 = await pool.query(
      `SELECT lt.*, t.name, t.short_name, t.logo_url
       FROM league_table lt JOIN teams t ON lt.team_id = t.id
       ORDER BY lt.position ASC`
    );
    res.json(res2.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/team-form/:teamId', async (req, res) => {
  try {
    const res2 = await pool.query(
      `SELECT tf.* FROM team_form tf WHERE tf.team_id = $1 ORDER BY tf.created_at DESC LIMIT 5`,
      [req.params.teamId]
    );
    res.json(res2.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const details = await getMatchWithDetails(req.params.id);
    if (!details.match) return res.status(404).json({ error: 'Match not found' });
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
