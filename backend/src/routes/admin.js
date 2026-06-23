import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import pool from '../db/pool.js';
import { auditLog } from '../services/auditService.js';
import { getAllSettings, updateSetting } from '../services/settingsService.js';
import { creditAccount, debitAccount } from '../services/walletService.js';
import { voidBet } from '../services/bettingService.js';
import { createNotification } from '../services/notificationService.js';
import {
  createScheduledMatch,
  simulateMatch,
  getMatchWithDetails,
} from '../services/matchEngine.js';
import { settleBetsForMatch } from '../services/bettingService.js';
import { forceFinishMatch } from '../services/schedulerService.js';
import { generateMatchOdds } from '../services/oddsService.js';
import { buildPresetGoalEvents, buildPresetEvents } from '../services/liveMatchService.js';
import adminLiveMatchRoutes from './adminLiveMatch.js';
import adminPaymentsRoutes from './adminPayments.js';
import adminBetsRoutes from './adminBets.js';
import superAdminRoutes from './adminSuper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

const router = Router();
router.use(authenticate, requireAdmin);
router.use(adminLiveMatchRoutes);
router.use(adminPaymentsRoutes);
router.use(adminBetsRoutes);
router.use(superAdminRoutes);

// Dashboard analytics
router.get('/analytics', async (req, res) => {
  try {
    const [users, deposits, withdrawals, bets, profit] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL \'24 hours\') as active FROM users WHERE role = \'user\''),
      pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'deposit\' AND status = \'completed\''),
      pool.query('SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE amount END), 0) as total FROM transactions WHERE type = \'withdrawal\' AND status = \'completed\''),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(stake), 0) as total_stake FROM bets'),
      pool.query(`
        SELECT COALESCE(SUM(CASE WHEN status = 'lost' THEN stake ELSE 0 END), 0) as house_profit,
               COALESCE(SUM(CASE WHEN status = 'won' THEN potential_win ELSE 0 END), 0) as payouts
        FROM bets WHERE status IN ('won', 'lost')
      `),
    ]);

    const matchStats = await pool.query(`
      SELECT COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE status = 'live') as live_matches,
        COUNT(*) FILTER (WHERE status = 'finished') as finished_matches
      FROM matches
    `);

    res.json({
      totalUsers: parseInt(users.rows[0].total),
      activeUsers24h: parseInt(users.rows[0].active),
      totalDeposits: parseFloat(deposits.rows[0].total),
      totalWithdrawals: parseFloat(withdrawals.rows[0].total),
      totalBets: parseInt(bets.rows[0].total),
      totalStake: parseFloat(bets.rows[0].total_stake),
      totalWinnings: parseFloat(profit.rows[0].payouts),
      houseProfit: parseFloat(profit.rows[0].house_profit) - parseFloat(profit.rows[0].payouts),
      matchStats: matchStats.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aggregated dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const [users, deposits, withdrawals, bets, liveMatches] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users WHERE role = \'user\''),
      pool.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as amount
         FROM deposit_requests WHERE status IN ('pending', 'approved', 'completed')`
      ),
      pool.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as amount
         FROM withdrawal_requests WHERE status IN ('pending', 'approved', 'completed')`
      ),
      pool.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(stake), 0) as stake,
         COALESCE(SUM(CASE WHEN status = 'won' THEN potential_win ELSE 0 END), 0) as winnings
         FROM bets`
      ),
      pool.query('SELECT COUNT(*) as total FROM matches WHERE status = \'live\''),
    ]);

    res.json({
      users: users.rows[0],
      deposits: deposits.rows[0],
      withdrawals: withdrawals.rows[0],
      bets: bets.rows[0],
      liveMatches: liveMatches.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teams CRUD
router.get('/teams', async (req, res) => {
  const result = await pool.query('SELECT * FROM teams ORDER BY name');
  res.json(result.rows);
});

router.post('/teams', async (req, res) => {
  const { name, shortName, league } = req.body;
  const result = await pool.query(
    'INSERT INTO teams (name, short_name, league) VALUES ($1, $2, $3) RETURNING *',
    [name, shortName, league]
  );
  await pool.query('INSERT INTO league_table (team_id) VALUES ($1)', [result.rows[0].id]);
  await auditLog(req.user.id, 'team_created', 'team', result.rows[0].id, { name }, req.ip);
  res.status(201).json(result.rows[0]);
});

router.put('/teams/:id', async (req, res) => {
  const { name, shortName, league, isActive } = req.body;
  const result = await pool.query(
    'UPDATE teams SET name = $1, short_name = $2, league = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
    [name, shortName, league, isActive, req.params.id]
  );
  await auditLog(req.user.id, 'team_updated', 'team', req.params.id, req.body, req.ip);
  res.json(result.rows[0]);
});

router.delete('/teams/:id', async (req, res) => {
  await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
  await auditLog(req.user.id, 'team_deleted', 'team', req.params.id, {}, req.ip);
  res.json({ message: 'Team deleted' });
});

router.post('/teams/:id/logo', upload.single('logo'), async (req, res) => {
  const logoUrl = `/uploads/${req.file.filename}`;
  const result = await pool.query(
    'UPDATE teams SET logo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [logoUrl, req.params.id]
  );
  res.json(result.rows[0]);
});

// Matches management
router.post('/matches', async (req, res) => {
  const { homeTeamId, awayTeamId, scheduledAt, presetHomeScore, presetAwayScore, goals, events } = req.body;
  const builtEvents = events?.length ? buildPresetEvents(events) : buildPresetGoalEvents(goals || []);
  const preset = builtEvents.length
    ? {
        homeScore: presetHomeScore ?? builtEvents.filter((e) => e.team === 'home' && e.type === 'goal').length,
        awayScore: presetAwayScore ?? builtEvents.filter((e) => e.team === 'away' && e.type === 'goal').length,
        events: builtEvents,
      }
    : null;
  const match = await createScheduledMatch(homeTeamId, awayTeamId, new Date(scheduledAt), null, null, null, preset);
  await auditLog(req.user.id, 'match_scheduled', 'match', match.id, req.body, req.ip);
  res.status(201).json(match);
});

router.put('/matches/:id/odds', async (req, res) => {
  const { odds } = req.body;
  for (const o of odds) {
    await pool.query(
      'UPDATE match_odds SET odds = $1, updated_at = NOW() WHERE match_id = $2 AND market = $3 AND selection = $4',
      [o.odds, req.params.id, o.market, o.selection]
    );
  }
  await auditLog(req.user.id, 'odds_updated', 'match', req.params.id, { odds }, req.ip);
  res.json({ message: 'Odds updated' });
});

router.put('/matches/:id/result', async (req, res) => {
  const { homeScore, awayScore, goalTimes } = req.body;
  const result = await forceFinishMatch(req.params.id, {
    home_score: homeScore,
    away_score: awayScore,
    goal_times: goalTimes,
  });
  await auditLog(req.user.id, 'match_result_set', 'match', req.params.id, req.body, req.ip);
  res.json(result);
});

router.put('/matches/:id/void', async (req, res) => {
  await pool.query('UPDATE matches SET status = $1, updated_at = NOW() WHERE id = $2', ['voided', req.params.id]);
  const bets = await pool.query(
    'SELECT DISTINCT bet_id FROM bet_selections WHERE match_id = $1',
    [req.params.id]
  );
  for (const b of bets.rows) await voidBet(b.bet_id);
  await auditLog(req.user.id, 'match_voided', 'match', req.params.id, {}, req.ip);
  res.json({ message: 'Match voided' });
});

// Settings
router.get('/settings', async (req, res) => {
  res.json(await getAllSettings());
});

router.put('/settings', async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await updateSetting(key, value);
  }
  await auditLog(req.user.id, 'settings_updated', 'settings', null, req.body, req.ip);
  res.json(await getAllSettings());
});

router.put('/league-table', async (req, res) => {
  const { entries } = req.body;
  for (const e of entries) {
    await pool.query(
      `UPDATE league_table SET played = $2, won = $3, drawn = $4, lost = $5,
       goals_for = $6, goals_against = $7, points = $8, position = $9, updated_at = NOW()
       WHERE team_id = $1`,
      [e.teamId, e.played, e.won, e.drawn, e.lost, e.goalsFor, e.goalsAgainst, e.points, e.position]
    );
  }
  const { emitStatsUpdate } = await import('../services/liveMatchService.js');
  emitStatsUpdate();
  res.json({ message: 'League table updated' });
});

router.post('/league-table/reset', async (req, res) => {
  await pool.query(
    `UPDATE league_table SET played = 0, won = 0, drawn = 0, lost = 0,
     goals_for = 0, goals_against = 0, points = 0, updated_at = NOW()`
  );
  await pool.query('DELETE FROM team_form');
  const teams = await pool.query('SELECT team_id FROM league_table ORDER BY team_id');
  let pos = 1;
  for (const t of teams.rows) {
    await pool.query('UPDATE league_table SET position = $1 WHERE team_id = $2', [pos++, t.team_id]);
  }
  await auditLog(req.user.id, 'league_table_reset', 'league_table', null, {}, req.ip);
  res.json({ message: 'League tables reset' });
});

// Users management
router.get('/users', async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, phone, first_name, last_name, role, balance, is_suspended, created_at FROM users ORDER BY created_at DESC LIMIT 200'
  );
  res.json(result.rows);
});

router.put('/users/:id/suspend', async (req, res) => {
  const { suspend } = req.body;
  await pool.query(
    'UPDATE users SET is_suspended = $1, role = $2, updated_at = NOW() WHERE id = $3',
    [suspend, suspend ? 'suspended' : 'user', req.params.id]
  );
  await auditLog(req.user.id, suspend ? 'user_suspended' : 'user_unsuspended', 'user', req.params.id, {}, req.ip);
  res.json({ message: suspend ? 'User suspended' : 'User unsuspended' });
});

router.post('/users/:id/credit', async (req, res) => {
  const { amount, description } = req.body;
  const balance = await creditAccount(req.params.id, parseFloat(amount), 'admin_credit', null, description || 'Admin credit');
  await auditLog(req.user.id, 'admin_credit', 'user', req.params.id, { amount }, req.ip);
  res.json({ balance });
});

router.post('/users/:id/debit', async (req, res) => {
  const { amount, description } = req.body;
  const balance = await debitAccount(req.params.id, parseFloat(amount), 'admin_debit', null, description || 'Admin debit');
  await auditLog(req.user.id, 'admin_debit', 'user', req.params.id, { amount }, req.ip);
  res.json({ balance });
});

// Bets management — see adminBets.js

// Deposit/withdrawal routes moved to adminPayments.js

// Audit logs
router.get('/audit-logs', async (req, res) => {
  const result = await pool.query(
    `SELECT al.*, u.email FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC LIMIT 200`
  );
  res.json(result.rows);
});

router.get('/bets/booking/:code', async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, u.email FROM bets b JOIN users u ON b.user_id = u.id WHERE b.booking_code = $1`,
    [req.params.code]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
  const selections = await pool.query('SELECT * FROM bet_selections WHERE bet_id = $1', [result.rows[0].id]);
  res.json({ bet: result.rows[0], selections: selections.rows });
});

router.put('/competition/pause', async (req, res) => {
  const { paused } = req.body;
  await updateSetting('competition_paused', paused ? 'true' : 'false');
  res.json({ message: paused ? 'Competition paused' : 'Competition resumed' });
});

router.put('/users/:id/ban', async (req, res) => {
  const { ban } = req.body;
  await pool.query('UPDATE users SET is_banned = $1, role = $2, updated_at = NOW() WHERE id = $3', [ban, ban ? 'suspended' : 'user', req.params.id]);
  res.json({ message: ban ? 'User banned' : 'User unbanned' });
});

router.post('/users/:id/reset-password', async (req, res) => {
  const bcrypt = await import('bcryptjs');
  const { password } = req.body;
  const hash = await bcrypt.default.hash(password || 'reset123', 12);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.params.id]);
  res.json({ message: 'Password reset' });
});

export default router;
