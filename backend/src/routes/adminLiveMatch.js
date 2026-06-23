/**
 * Live Match Editor routes — mounted from admin.js so production always registers them.
 */
import { Router } from 'express';
import pool from '../db/pool.js';
import { auditLog } from '../services/auditService.js';
import { ensureTeamSquad } from '../services/playerService.js';
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
} from '../services/liveMatchService.js';

const router = Router();

router.get('/matches/history/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    res.json(await getMatchHistory(limit));
  } catch (err) {
    console.error('[adminLive] history/list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/matches/:id/live', async (req, res) => {
  try {
    res.json(await getLiveMatchAdminState(req.params.id));
  } catch (err) {
    console.error('[adminLive] GET live error:', err.message);
    res.status(404).json({ error: err.message });
  }
});

router.put('/matches/:id/live', async (req, res) => {
  try {
    const data = await updateLiveMatchFields(req.params.id, req.body);
    await auditLog(req.user.id, 'live_match_updated', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    console.error('[adminLive] PUT live error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.post('/matches/:id/goals', async (req, res) => {
  try {
    console.log('[adminLive] POST goal', req.params.id, req.body);
    const data = await addGoalEvent(req.params.id, req.body);
    await auditLog(req.user.id, 'goal_added', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    console.error('[adminLive] POST goal error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.delete('/matches/:id/goals/:eventId', async (req, res) => {
  try {
    const data = await deleteGoalEvent(req.params.id, req.params.eventId);
    await auditLog(req.user.id, 'goal_deleted', 'match', req.params.id, { eventId: req.params.eventId }, req.ip);
    res.json(data);
  } catch (err) {
    console.error('[adminLive] DELETE goal error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.put('/matches/:id/goals/:eventId', async (req, res) => {
  try {
    const data = await updateGoalEvent(req.params.id, req.params.eventId, req.body);
    await auditLog(req.user.id, 'goal_updated', 'match', req.params.id, req.body, req.ip);
    res.json(data);
  } catch (err) {
    console.error('[adminLive] PUT goal error:', err.message);
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

router.get('/players', async (req, res) => {
  try {
    const { teamId } = req.query;
    if (teamId) {
      const players = await ensureTeamSquad(teamId);
      console.log(`[adminLive] GET /players teamId=${teamId} count=${players.length}`);
      return res.json(players);
    }
    const result = await pool.query(
      `SELECT p.*, t.name AS team_name, t.short_name AS team_short
       FROM players p JOIN teams t ON p.team_id = t.id WHERE p.is_active = TRUE
       ORDER BY t.name, p.position, p.shirt_number`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[adminLive] GET /players error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/live-editor/health', (_req, res) => {
  res.json({ ok: true, module: 'adminLiveMatch', version: 'v5' });
});

export default router;
