import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';
import { auditLog } from '../services/auditService.js';
import { updateSetting, getAllSettings } from '../services/settingsService.js';
import { generateMatchOdds } from '../services/oddsService.js';
import { createScheduledMatch } from '../services/matchEngine.js';
import { ensureTeamSquad } from '../services/playerService.js';
import { voidBet } from '../services/bettingService.js';
import { createNotification } from '../services/notificationService.js';
import { requireSuperAdmin, requireAdminRole } from '../middleware/roles.js';
import {
  listAdminWinners,
  createWinner,
  updateWinner,
  deleteWinner,
  emitWinnersUpdate,
} from '../services/winnersService.js';
import {
  getLiveMatchAdminState,
  updateLiveMatchFields,
  addGoalEvent,
  deleteGoalEvent,
  updateGoalEvent,
  startMatchPlayback,
  endMatchNow,
  getMatchHistory,
  saveMatchPreset,
  addMatchEvent,
  deleteMatchEvent,
  forceFullTimeResult,
  setMatchStatus,
  emitStatsUpdate,
  buildPresetEvents,
} from '../services/liveMatchService.js';
import { saveBetslip } from '../services/betslipService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `banner-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } });

const winnerStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `winner-${Date.now()}${path.extname(file.originalname)}`),
});
const winnerUpload = multer({ storage: winnerStorage, limits: { fileSize: 2 * 1024 * 1024 } });

const router = Router();

// ─── Analytics reports ─────────────────────────────────────────────
router.get('/analytics/daily', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE(created_at) as date,
        COUNT(*) FILTER (WHERE type = 'deposit') as deposits,
        COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as deposit_amount,
        COUNT(*) FILTER (WHERE type = 'withdrawal') as withdrawals,
        COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE amount END) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0) as withdrawal_amount
      FROM transactions
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date DESC
    `);
    const bets = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as bets, COALESCE(SUM(stake), 0) as stake
      FROM bets WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date DESC
    `);
    res.json({ transactions: result.rows, bets: bets.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/monthly', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as bets,
        COALESCE(SUM(stake), 0) as stake,
        COALESCE(SUM(CASE WHEN status = 'won' THEN potential_win ELSE 0 END), 0) as payouts
      FROM bets
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Leagues, seasons, tournaments ───────────────────────────────
router.get('/leagues', async (req, res) => {
  const result = await pool.query('SELECT * FROM leagues ORDER BY name');
  res.json(result.rows);
});

router.post('/leagues', async (req, res) => {
  const { name, code, description } = req.body;
  const result = await pool.query(
    'INSERT INTO leagues (name, code, description) VALUES ($1, $2, $3) RETURNING *',
    [name, code, description]
  );
  await auditLog(req.user.id, 'league_created', 'league', result.rows[0].id, { name }, req.ip);
  res.status(201).json(result.rows[0]);
});

router.put('/leagues/:id', async (req, res) => {
  const { name, code, description, isActive } = req.body;
  const result = await pool.query(
    'UPDATE leagues SET name = $1, code = $2, description = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
    [name, code, description, isActive, req.params.id]
  );
  res.json(result.rows[0]);
});

router.get('/seasons', async (req, res) => {
  const result = await pool.query(
    `SELECT s.*, l.name as league_name FROM seasons s LEFT JOIN leagues l ON s.league_id = l.id ORDER BY s.created_at DESC`
  );
  res.json(result.rows);
});

router.post('/seasons', async (req, res) => {
  const { name, leagueId, startDate, endDate } = req.body;
  const result = await pool.query(
    'INSERT INTO seasons (name, league_id, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, leagueId, startDate, endDate]
  );
  await auditLog(req.user.id, 'season_created', 'season', result.rows[0].id, { name }, req.ip);
  res.status(201).json(result.rows[0]);
});

router.get('/tournaments', async (req, res) => {
  const result = await pool.query(
    `SELECT t.*, l.name as league_name, s.name as season_name
     FROM tournaments t LEFT JOIN leagues l ON t.league_id = l.id LEFT JOIN seasons s ON t.season_id = s.id
     ORDER BY t.created_at DESC`
  );
  res.json(result.rows);
});

router.post('/tournaments', async (req, res) => {
  const { name, leagueId, seasonId } = req.body;
  const result = await pool.query(
    'INSERT INTO tournaments (name, league_id, season_id) VALUES ($1, $2, $3) RETURNING *',
    [name, leagueId, seasonId]
  );
  await auditLog(req.user.id, 'tournament_created', 'tournament', result.rows[0].id, { name }, req.ip);
  res.status(201).json(result.rows[0]);
});

// ─── Match management (extended) ─────────────────────────────────
router.get('/matches', async (req, res) => {
  const { status, archived } = req.query;
  let query = `
    SELECT m.*, ht.name as home_team_name, at.name as away_team_name,
           ht.short_name as home_short, at.short_name as away_short
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE 1=1`;
  const params = [];
  if (status) {
    params.push(status);
    query += ` AND m.status = $${params.length}`;
  }
  if (archived === 'true') query += ' AND m.is_archived = true';
  else if (archived === 'false') query += ' AND m.is_archived = false';
  query += ' ORDER BY m.scheduled_at DESC LIMIT 200';
  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.get('/matches/history/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    res.json(await getMatchHistory(limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/matches/:id', async (req, res) => {
  const { scheduledAt, leagueId, seasonId, tournamentId, matchNumber } = req.body;
  const result = await pool.query(
    `UPDATE matches SET scheduled_at = COALESCE($1, scheduled_at),
     league_id = COALESCE($2, league_id), season_id = COALESCE($3, season_id),
     tournament_id = COALESCE($4, tournament_id), match_number = COALESCE($5, match_number),
     updated_at = NOW() WHERE id = $6 RETURNING *`,
    [scheduledAt, leagueId, seasonId, tournamentId, matchNumber, req.params.id]
  );
  await auditLog(req.user.id, 'match_updated', 'match', req.params.id, req.body, req.ip);
  res.json(result.rows[0]);
});

router.put('/matches/:id/pause', async (req, res) => {
  const { paused } = req.body;
  await pool.query('UPDATE matches SET is_paused = $1, updated_at = NOW() WHERE id = $2', [paused, req.params.id]);
  await auditLog(req.user.id, paused ? 'match_paused' : 'match_resumed', 'match', req.params.id, {}, req.ip);
  res.json({ message: paused ? 'Match paused' : 'Match resumed' });
});

router.put('/matches/:id/cancel', async (req, res) => {
  await pool.query('UPDATE matches SET status = $1, updated_at = NOW() WHERE id = $2', ['voided', req.params.id]);
  const bets = await pool.query('SELECT DISTINCT bet_id FROM bet_selections WHERE match_id = $1', [req.params.id]);
  for (const b of bets.rows) await voidBet(b.bet_id);
  await auditLog(req.user.id, 'match_cancelled', 'match', req.params.id, {}, req.ip);
  res.json({ message: 'Match cancelled' });
});

router.put('/matches/:id/archive', async (req, res) => {
  const { archived } = req.body;
  await pool.query('UPDATE matches SET is_archived = $1, updated_at = NOW() WHERE id = $2', [archived, req.params.id]);
  await auditLog(req.user.id, archived ? 'match_archived' : 'match_unarchived', 'match', req.params.id, {}, req.ip);
  res.json({ message: archived ? 'Match archived' : 'Match unarchived' });
});

router.delete('/matches/:id', async (req, res) => {
  const live = await pool.query('SELECT status FROM matches WHERE id = $1', [req.params.id]);
  if (!live.rows[0]) return res.status(404).json({ error: 'Match not found' });
  if (live.rows[0].status === 'live') return res.status(400).json({ error: 'Cannot delete a live match' });
  await pool.query('DELETE FROM match_events WHERE match_id = $1', [req.params.id]);
  await pool.query('DELETE FROM match_odds WHERE match_id = $1', [req.params.id]);
  await pool.query('DELETE FROM matches WHERE id = $1', [req.params.id]);
  await auditLog(req.user.id, 'match_deleted', 'match', req.params.id, {}, req.ip);
  res.json({ message: 'Match deleted' });
});

router.put('/matches/:id/restart', async (req, res) => {
  await pool.query(
    `UPDATE matches SET status = 'scheduled', home_score = 0, away_score = 0, is_paused = false,
     started_at = NULL, finished_at = NULL, live_minute = 0, admin_commentary = NULL,
     possession_home = 50, possession_away = 50, shots_home = 0, shots_away = 0,
     corners_home = 0, corners_away = 0, yellow_cards_home = 0, yellow_cards_away = 0,
     red_cards_home = 0, red_cards_away = 0, updated_at = NOW() WHERE id = $1`,
    [req.params.id]
  );
  await pool.query('DELETE FROM match_events WHERE match_id = $1', [req.params.id]);
  const matchRes = await pool.query(
    `SELECT ht.strength AS home_strength, at.strength AS away_strength
     FROM matches m JOIN teams ht ON m.home_team_id = ht.id JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [req.params.id]
  );
  if (matchRes.rows[0]) {
    await pool.query('DELETE FROM match_odds WHERE match_id = $1', [req.params.id]);
    const odds = generateMatchOdds(matchRes.rows[0].home_strength || 50, matchRes.rows[0].away_strength || 50);
    for (const o of odds) {
      await pool.query(
        'INSERT INTO match_odds (match_id, market, selection, odds) VALUES ($1, $2, $3, $4)',
        [req.params.id, o.market, o.selection, o.odds]
      );
    }
  }
  await auditLog(req.user.id, 'match_restarted', 'match', req.params.id, {}, req.ip);
  res.json({ message: 'Match restarted' });
});

router.post('/matches/:id/regenerate-odds', async (req, res) => {
  const matchRes = await pool.query(
    `SELECT ht.strength AS home_strength, at.strength AS away_strength
     FROM matches m JOIN teams ht ON m.home_team_id = ht.id JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [req.params.id]
  );
  if (!matchRes.rows[0]) return res.status(404).json({ error: 'Match not found' });
  const { home_strength, away_strength } = matchRes.rows[0];
  await pool.query('DELETE FROM match_odds WHERE match_id = $1', [req.params.id]);
  const odds = generateMatchOdds(home_strength || 50, away_strength || 50);
  for (const o of odds) {
    await pool.query(
      'INSERT INTO match_odds (match_id, market, selection, odds) VALUES ($1, $2, $3, $4)',
      [req.params.id, o.market, o.selection, o.odds]
    );
  }
  const rows = await pool.query('SELECT * FROM match_odds WHERE match_id = $1', [req.params.id]);
  res.json(rows.rows);
});

router.get('/matches/:id/odds', async (req, res) => {
  const result = await pool.query('SELECT * FROM match_odds WHERE match_id = $1 ORDER BY market, selection', [req.params.id]);
  res.json(result.rows);
});

router.get('/matches/:id/live', async (req, res) => {
  try {
    res.json(await getLiveMatchAdminState(req.params.id));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.put('/matches/:id/live', async (req, res) => {
  try {
    const data = await updateLiveMatchFields(req.params.id, req.body);
    await auditLog(req.user.id, 'live_match_updated', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/matches/:id/goals', async (req, res) => {
  try {
    const data = await addGoalEvent(req.params.id, req.body);
    await auditLog(req.user.id, 'goal_added', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/matches/:id/goals/:eventId', async (req, res) => {
  try {
    const data = await deleteGoalEvent(req.params.id, req.params.eventId);
    await auditLog(req.user.id, 'goal_deleted', 'match', req.params.id, { eventId: req.params.eventId }, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/matches/:id/goals/:eventId', async (req, res) => {
  try {
    const data = await updateGoalEvent(req.params.id, req.params.eventId, req.body);
    await auditLog(req.user.id, 'goal_updated', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/matches/:id/start', async (req, res) => {
  try {
    const data = await startMatchPlayback(req.params.id);
    await auditLog(req.user.id, 'match_started', 'match', req.params.id, {}, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/matches/:id/end', async (req, res) => {
  try {
    const data = await endMatchNow(req.params.id);
    await auditLog(req.user.id, 'match_ended', 'match', req.params.id, {}, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/matches/:id/preset', async (req, res) => {
  try {
    const data = await saveMatchPreset(req.params.id, req.body);
    await auditLog(req.user.id, 'match_preset_saved', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/matches/:id/events', async (req, res) => {
  try {
    const data = await addMatchEvent(req.params.id, req.body);
    await auditLog(req.user.id, 'match_event_added', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/matches/:id/events/:eventId', async (req, res) => {
  try {
    const data = await deleteMatchEvent(req.params.id, req.params.eventId);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/matches/:id/force-result', async (req, res) => {
  try {
    const { homeScore, awayScore } = req.body;
    const data = await forceFullTimeResult(req.params.id, { homeScore, awayScore });
    emitStatsUpdate();
    await auditLog(req.user.id, 'match_force_result', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/matches/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const data = await setMatchStatus(req.params.id, status);
    await auditLog(req.user.id, 'match_status_changed', 'match', req.params.id, { status }, req.ip);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── All players (goal scorers) ──────────────────────────────────
router.get('/players', async (req, res) => {
  try {
    const { teamId } = req.query;
    if (teamId) {
      const players = await ensureTeamSquad(teamId);
      console.log(`[admin] GET /players teamId=${teamId} count=${players.length}`);
      return res.json(players);
    }
    const result = await pool.query(
      `SELECT p.*, t.name AS team_name, t.short_name AS team_short
       FROM players p JOIN teams t ON p.team_id = t.id WHERE p.is_active = TRUE
       ORDER BY t.name, p.position, p.shirt_number`
    );
    console.log(`[admin] GET /players all count=${result.rows.length}`);
    res.json(result.rows);
  } catch (err) {
    console.error('[admin] GET /players error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Team extended ───────────────────────────────────────────────
router.put('/teams/:id/details', async (req, res) => {
  const {
    strength, colorPrimary, colorSecondary, league,
    starRating, attackRating, midfieldRating, defenseRating, name, shortName,
  } = req.body;
  const result = await pool.query(
    `UPDATE teams SET
       name = COALESCE($1, name),
       short_name = COALESCE($2, short_name),
       strength = COALESCE($3, strength),
       star_rating = COALESCE($4, star_rating),
       attack_rating = COALESCE($5, attack_rating),
       midfield_rating = COALESCE($6, midfield_rating),
       defense_rating = COALESCE($7, defense_rating),
       color_primary = COALESCE($8, color_primary),
       color_secondary = COALESCE($9, color_secondary),
       league = COALESCE($10, league),
       updated_at = NOW()
     WHERE id = $11 RETURNING *`,
    [name, shortName, strength, starRating, attackRating, midfieldRating, defenseRating, colorPrimary, colorSecondary, league, req.params.id]
  );
  await auditLog(req.user.id, 'team_details_updated', 'team', req.params.id, req.body, req.ip);
  res.json(result.rows[0]);
});

router.get('/teams/:id/players', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM players WHERE team_id = $1 ORDER BY position, shirt_number',
    [req.params.id]
  );
  res.json(result.rows);
});

router.post('/teams/:id/players', async (req, res) => {
  const { name, position, shirtNumber, starRating, isStriker } = req.body;
  const result = await pool.query(
    `INSERT INTO players (team_id, name, position, shirt_number, star_rating, is_striker)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.params.id, name, position || 'MID', shirtNumber || null, starRating || 3, Boolean(isStriker)]
  );
  await auditLog(req.user.id, 'player_created', 'player', result.rows[0].id, req.body, req.ip);
  res.status(201).json(result.rows[0]);
});

router.put('/players/:id', async (req, res) => {
  const { name, position, shirtNumber, starRating, isStriker, isActive, goalsSeason } = req.body;
  const result = await pool.query(
    `UPDATE players SET name = COALESCE($1, name), position = COALESCE($2, position),
     shirt_number = COALESCE($3, shirt_number), star_rating = COALESCE($4, star_rating),
     is_striker = COALESCE($5, is_striker), is_active = COALESCE($6, is_active),
     goals_season = COALESCE($7, goals_season), updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [name, position, shirtNumber, starRating, isStriker, isActive, goalsSeason, req.params.id]
  );
  emitStatsUpdate();
  res.json(result.rows[0]);
});

router.delete('/players/:id', async (req, res) => {
  await pool.query('DELETE FROM players WHERE id = $1', [req.params.id]);
  res.json({ message: 'Player deleted' });
});

router.get('/fixtures', async (req, res) => {
  const { league } = req.query;
  const params = [];
  let filter = '';
  if (league) {
    params.push(league);
    filter = `AND l.name = $${params.length}`;
  }
  const result = await pool.query(
    `SELECT sf.*, ht.name AS home_name, at.name AS away_name, l.name AS league_name
     FROM season_fixtures sf
     JOIN teams ht ON sf.home_team_id = ht.id
     JOIN teams at ON sf.away_team_id = at.id
     LEFT JOIN leagues l ON sf.league_id = l.id
     WHERE 1=1 ${filter}
     ORDER BY sf.scheduled_order ASC LIMIT 200`,
    params
  );
  res.json(result.rows);
});

// ─── Users extended ──────────────────────────────────────────────
router.get('/users/:id/transactions', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.params.id]
  );
  res.json(result.rows);
});

router.put('/users/:id/role', requireSuperAdmin, async (req, res) => {
  const { role } = req.body;
  await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, req.params.id]);
  await auditLog(req.user.id, 'user_role_changed', 'user', req.params.id, { role }, req.ip);
  res.json({ message: 'Role updated' });
});

// ─── Booking codes ───────────────────────────────────────────────
router.get('/booking-codes', async (req, res) => {
  const { search } = req.query;
  let query = `SELECT b.*, u.email FROM bets b JOIN users u ON b.user_id = u.id`;
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    query += ` WHERE b.booking_code ILIKE $1`;
  }
  query += ' ORDER BY b.created_at DESC LIMIT 100';
  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.put('/bets/:id/booking-code', requireSuperAdmin, async (req, res) => {
  const { bookingCode, expiresAt } = req.body;
  const code = String(bookingCode || '').trim().toUpperCase();
  if (code.length < 4 || code.length > 20) {
    return res.status(400).json({ error: 'Booking code must be 4–20 characters' });
  }
  const clash = await pool.query('SELECT id FROM bets WHERE booking_code = $1 AND id != $2', [code, req.params.id]);
  if (clash.rows.length) return res.status(409).json({ error: 'Booking code already in use' });
  const result = await pool.query(
    'UPDATE bets SET booking_code = $1, booking_code_expires_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [code, expiresAt || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Bet not found' });
  await auditLog(req.user.id, 'booking_code_updated', 'bet', req.params.id, { bookingCode: code, expiresAt }, req.ip);
  res.json(result.rows[0]);
});

router.get('/saved-betslips', async (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM saved_betslips';
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    query += ` WHERE code ILIKE $1`;
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.post('/saved-betslips', async (req, res) => {
  try {
    const { code, selections, stake, expiresAt } = req.body;
    const slip = await saveBetslip(selections || [], stake || 10, code || null);
    if (expiresAt) {
      await pool.query('UPDATE saved_betslips SET expires_at = $1 WHERE code = $2', [expiresAt, slip.code]);
    }
    await auditLog(req.user.id, 'betslip_precreate', 'saved_betslip', slip.code, req.body, req.ip);
    res.status(201).json(slip);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/top-scorers', async (req, res) => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.goals_season, p.star_rating, t.name AS team_name, t.short_name
     FROM players p JOIN teams t ON p.team_id = t.id
     WHERE p.is_active = TRUE ORDER BY p.goals_season DESC, p.star_rating DESC LIMIT 50`
  );
  res.json(result.rows);
});

router.put('/saved-betslips/:id', async (req, res) => {
  const { expiresAt, code } = req.body;
  const result = await pool.query(
    'UPDATE saved_betslips SET expires_at = COALESCE($1, expires_at), code = COALESCE($2, code) WHERE id = $3 RETURNING *',
    [expiresAt || null, code ? String(code).toUpperCase() : null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

// ─── Payment config ──────────────────────────────────────────────
router.get('/payment-config', async (req, res) => {
  const settings = await getAllSettings();
  res.json({
    mtn_momo: settings.mtn_momo_number || '0551234567',
    mtn_momo_name: settings.mtn_momo_name || 'SkyBet',
    telecel_number: settings.telecel_number || '0201234567',
    telecel_name: settings.telecel_name || 'SkyBet',
    airteltigo_number: settings.airteltigo_number || '0271234567',
    airteltigo_name: settings.airteltigo_name || 'SkyBet',
  });
});

router.put('/payment-config', requireAdminRole, async (req, res) => {
  const fields = {
    mtn_momo_number: req.body.mtn_momo,
    mtn_momo_name: req.body.mtn_momo_name,
    telecel_number: req.body.telecel_number,
    telecel_name: req.body.telecel_name,
    airteltigo_number: req.body.airteltigo_number,
    airteltigo_name: req.body.airteltigo_name,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) await updateSetting(key, value);
  }
  await auditLog(req.user.id, 'payment_config_updated', 'settings', null, req.body, req.ip);
  res.json({ message: 'Payment config updated' });
});

// ─── Content: promotions ─────────────────────────────────────────
router.get('/promotions', async (req, res) => {
  const result = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/promotions', async (req, res) => {
  const { title, description, badge, imageUrl, isActive } = req.body;
  const result = await pool.query(
    'INSERT INTO promotions (title, description, badge, image_url, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [title, description, badge, imageUrl, isActive ?? true]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/promotions/:id', async (req, res) => {
  const { title, description, badge, imageUrl, isActive } = req.body;
  const result = await pool.query(
    'UPDATE promotions SET title = $1, description = $2, badge = $3, image_url = $4, is_active = $5 WHERE id = $6 RETURNING *',
    [title, description, badge, imageUrl, isActive, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/promotions/:id', async (req, res) => {
  await pool.query('DELETE FROM promotions WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ─── Content: banners ────────────────────────────────────────────
router.get('/banners', async (req, res) => {
  const result = await pool.query('SELECT * FROM content_banners ORDER BY position, created_at DESC');
  res.json(result.rows);
});

router.post('/banners', upload.single('image'), async (req, res) => {
  const { title, subtitle, linkUrl, badge, position, isActive } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;
  const result = await pool.query(
    `INSERT INTO content_banners (title, subtitle, image_url, link_url, badge, position, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [title, subtitle, imageUrl, linkUrl, badge, position || 0, isActive !== 'false']
  );
  res.status(201).json(result.rows[0]);
});

router.put('/banners/:id', async (req, res) => {
  const { title, subtitle, linkUrl, badge, position, isActive } = req.body;
  const result = await pool.query(
    `UPDATE content_banners SET title = $1, subtitle = $2, link_url = $3, badge = $4,
     position = $5, is_active = $6, updated_at = NOW() WHERE id = $7 RETURNING *`,
    [title, subtitle, linkUrl, badge, position, isActive, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/banners/:id', async (req, res) => {
  await pool.query('DELETE FROM content_banners WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ─── Announcements & notifications ───────────────────────────────
router.get('/announcements', async (req, res) => {
  const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/announcements', async (req, res) => {
  const { title, message, audience, isActive } = req.body;
  const result = await pool.query(
    'INSERT INTO announcements (title, message, audience, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
    [title, message, audience || 'all', isActive ?? true]
  );
  res.status(201).json(result.rows[0]);
});

router.post('/notifications/send', requireAdminRole, async (req, res) => {
  const { title, message, audience } = req.body;
  let users;
  if (audience === 'all') {
    users = await pool.query('SELECT id FROM users WHERE role = $1', ['user']);
  } else {
    users = await pool.query('SELECT id FROM users WHERE id = $1', [audience]);
  }
  for (const u of users.rows) {
    await createNotification(u.id, 'announcement', title, message);
  }
  await auditLog(req.user.id, 'notification_sent', 'notification', null, { title, count: users.rows.length }, req.ip);
  res.json({ message: `Sent to ${users.rows.length} users` });
});

// ─── Security ────────────────────────────────────────────────────
router.get('/login-history', requireAdminRole, async (req, res) => {
  const result = await pool.query(
    `SELECT lh.*, u.email as user_email FROM login_history lh
     LEFT JOIN users u ON lh.user_id = u.id ORDER BY lh.created_at DESC LIMIT 200`
  );
  res.json(result.rows);
});

router.get('/roles', (_req, res) => {
  res.json([
    { id: 'super_admin', label: 'Super Admin', description: 'Full platform control' },
    { id: 'admin', label: 'Admin', description: 'Manage matches, users, payments' },
    { id: 'manager', label: 'Manager', description: 'View analytics and approve payments' },
    { id: 'user', label: 'User', description: 'Standard betting account' },
  ]);
});

// ─── Recent Winners Manager ──────────────────────────────────────
router.get('/recent-winners', async (req, res) => {
  try {
    const winners = await listAdminWinners();
    const settings = await getAllSettings();
    res.json({
      winners,
      auto_rotation: settings.winners_auto_rotation === 'true',
      rotation_minutes: parseInt(settings.winners_rotation_minutes || '2', 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recent-winners', async (req, res) => {
  try {
    const winner = await createWinner(req.body);
    emitWinnersUpdate();
    await auditLog(req.user.id, 'winner_created', 'recent_winner', winner.id, req.body, req.ip);
    res.status(201).json(winner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/recent-winners/:id', async (req, res) => {
  try {
    const winner = await updateWinner(req.params.id, req.body);
    emitWinnersUpdate();
    await auditLog(req.user.id, 'winner_updated', 'recent_winner', req.params.id, req.body, req.ip);
    res.json(winner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/recent-winners/:id', async (req, res) => {
  try {
    await deleteWinner(req.params.id);
    emitWinnersUpdate();
    await auditLog(req.user.id, 'winner_deleted', 'recent_winner', req.params.id, {}, req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/recent-winners/:id/pin', async (req, res) => {
  try {
    const { pinned } = req.body;
    const winner = await updateWinner(req.params.id, { is_pinned: pinned });
    emitWinnersUpdate();
    res.json(winner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/recent-winners/:id/avatar', winnerUpload.single('avatar'), async (req, res) => {
  try {
    const profile_picture = req.file ? `/uploads/${req.file.filename}` : req.body.profile_picture;
    const winner = await updateWinner(req.params.id, { profile_picture });
    emitWinnersUpdate();
    res.json(winner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/recent-winners/settings/rotation', async (req, res) => {
  try {
    const { auto_rotation, rotation_minutes } = req.body;
    if (auto_rotation !== undefined) {
      await updateSetting('winners_auto_rotation', auto_rotation ? 'true' : 'false');
    }
    if (rotation_minutes !== undefined) {
      await updateSetting('winners_rotation_minutes', String(rotation_minutes));
    }
    res.json({ message: 'Winner rotation settings updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
