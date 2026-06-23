import pool from '../db/pool.js';
import { getMatchWithDetails } from './matchEngine.js';
import {
  runLiveSimulation,
  forceFinishMatch,
  stopLiveSimulation,
  setLiveOverride,
  clearLiveOverride,
  getSchedulerIo,
} from './schedulerService.js';
import { incrementPlayerGoals } from './playerService.js';
import { COMMENTARY, pick } from './simulationService.js';

export function buildPresetGoalEvents(goals = []) {
  return goals.map((g) => buildSingleEvent({ ...g, type: g.type || 'goal' }));
}

export function buildPresetEvents(events = []) {
  return events.map((e) => buildSingleEvent(e));
}

function buildSingleEvent(e) {
  const team = e.team === 'away' ? 'away' : 'home';
  const player = e.player || null;
  const minute = Math.min(90, Math.max(1, parseInt(e.minute, 10) || 1));
  const type = e.type || 'goal';
  const descMap = {
    goal: `⚽ GOAL! ${player || 'Unknown'} finds the back of the net! ${pick(COMMENTARY.goal)}`,
    penalty: `⚽ PENALTY! ${player || 'Unknown'} converts from the spot!`,
    yellow_card: `🟨 ${pick(COMMENTARY.yellow)}`,
    red_card: `🟥 ${pick(COMMENTARY.red)}`,
    corner: `🚩 Corner awarded...`,
    foul: pick(COMMENTARY.foul),
  };
  return {
    team,
    minute,
    type: type === 'penalty' ? 'goal' : type,
    player: player || undefined,
    playerId: e.playerId || null,
    description: e.description || descMap[type] || descMap.goal,
    isPenalty: type === 'penalty',
  };
}

function emit(matchId, event, payload) {
  const io = getSchedulerIo();
  if (io) io.emit(event, { matchId, ...payload });
}

async function loadMatchRow(matchId) {
  const res = await pool.query(
    `SELECT m.*, ht.name AS home_name, at.name AS away_name
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [matchId]
  );
  return res.rows[0];
}

async function recalcScoresFromGoals(matchId) {
  const goals = await pool.query(
    `SELECT me.*, ht.id AS home_id, at.id AS away_id
     FROM match_events me
     JOIN matches m ON m.id = me.match_id
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE me.match_id = $1 AND me.event_type = 'goal'
     ORDER BY me.minute ASC`,
    [matchId]
  );
  let home = 0;
  let away = 0;
  for (const g of goals.rows) {
    if (g.team_id === g.home_id) home++;
    else away++;
  }
  return { home, away };
}

export async function getLiveMatchAdminState(matchId) {
  const details = await getMatchWithDetails(matchId);
  const goals = details.events.filter((e) => e.event_type === 'goal');
  let presetEvents = details.match?.preset_events;
  if (typeof presetEvents === 'string') {
    try { presetEvents = JSON.parse(presetEvents); } catch { presetEvents = []; }
  }
  return { ...details, goals, presetEvents: presetEvents || [] };
}

export async function updateLiveMatchFields(matchId, fields) {
  const allowed = {
    home_score: 'homeScore',
    away_score: 'awayScore',
    live_minute: 'minute',
    possession_home: 'possessionHome',
    possession_away: 'possessionAway',
    shots_home: 'shotsHome',
    shots_away: 'shotsAway',
    corners_home: 'cornersHome',
    corners_away: 'cornersAway',
    yellow_cards_home: 'yellowHome',
    yellow_cards_away: 'yellowAway',
    red_cards_home: 'redHome',
    red_cards_away: 'redAway',
    fouls_home: 'foulsHome',
    fouls_away: 'foulsAway',
    admin_commentary: 'commentary',
  };

  const sets = [];
  const vals = [matchId];
  const override = {};
  let idx = 2;

  for (const [col, key] of Object.entries(allowed)) {
    const src = fields[key] ?? fields[col];
    if (src !== undefined && src !== null) {
      sets.push(`${col} = $${idx++}`);
      vals.push(src);
      if (['home_score', 'away_score', 'live_minute'].includes(col)) {
        override[col === 'home_score' ? 'homeScore' : col === 'away_score' ? 'awayScore' : 'minute'] = src;
      }
    }
  }

  if (!sets.length) throw new Error('No fields to update');

  sets.push('updated_at = NOW()');
  await pool.query(`UPDATE matches SET ${sets.join(', ')} WHERE id = $1`, vals);

  if (Object.keys(override).length) setLiveOverride(matchId, override);

  const match = await loadMatchRow(matchId);
  emit(matchId, 'match:update', {
    minute: match.live_minute,
    phase: match.live_minute <= 45 ? 'first_half' : 'second_half',
    homeScore: match.home_score,
    awayScore: match.away_score,
    commentary: match.admin_commentary || '',
    possessionHome: match.possession_home,
    possessionAway: match.possession_away,
    stats: {
      cornersHome: match.corners_home,
      cornersAway: match.corners_away,
      yellowHome: match.yellow_cards_home,
      yellowAway: match.yellow_cards_away,
      redHome: match.red_cards_home,
      redAway: match.red_cards_away,
      foulsHome: match.fouls_home,
      foulsAway: match.fouls_away,
      shotsHome: match.shots_home,
      shotsAway: match.shots_away,
    },
  });

  return getLiveMatchAdminState(matchId);
}

export async function addGoalEvent(matchId, { team, minute, player, playerId }) {
  const match = await loadMatchRow(matchId);
  if (!match) throw new Error('Match not found');

  const side = team === 'away' ? 'away' : 'home';
  const teamId = side === 'home' ? match.home_team_id : match.away_team_id;
  const min = Math.min(90, Math.max(1, parseInt(minute, 10) || 1));
  const playerName = player || 'Unknown';
  const desc = `⚽ GOAL! ${playerName} scores! ${pick(COMMENTARY.goal)}`;

  await pool.query(
    `INSERT INTO match_events (match_id, event_type, team_id, minute, player_name, description)
     VALUES ($1, 'goal', $2, $3, $4, $5)`,
    [matchId, teamId, min, playerName, desc]
  );

  if (playerId) await incrementPlayerGoals(playerId);

  const { home, away } = await recalcScoresFromGoals(matchId);
  await pool.query(
    `UPDATE matches SET home_score = $2, away_score = $3, live_minute = GREATEST(live_minute, $4), updated_at = NOW() WHERE id = $1`,
    [matchId, home, away, min]
  );

  setLiveOverride(matchId, { homeScore: home, awayScore: away, minute: min });

  emit(matchId, 'match:goal', { team: side, minute: min, player: playerName });
  emit(matchId, 'match:ticker', { type: 'goal', minute: min, player: playerName, team: side });
  emit(matchId, 'match:update', {
    minute: min,
    homeScore: home,
    awayScore: away,
    commentary: desc,
    events: [{ type: 'goal', team: side, minute: min, player: playerName, description: desc }],
  });

  return getLiveMatchAdminState(matchId);
}

export async function deleteGoalEvent(matchId, eventId) {
  const ev = await pool.query(
    'SELECT * FROM match_events WHERE id = $1 AND match_id = $2 AND event_type = $3',
    [eventId, matchId, 'goal']
  );
  if (!ev.rows[0]) throw new Error('Goal not found');

  await pool.query('DELETE FROM match_events WHERE id = $1', [eventId]);

  const { home, away } = await recalcScoresFromGoals(matchId);
  await pool.query(
    'UPDATE matches SET home_score = $2, away_score = $3, updated_at = NOW() WHERE id = $1',
    [matchId, home, away]
  );

  setLiveOverride(matchId, { homeScore: home, awayScore: away });
  emit(matchId, 'match:update', { homeScore: home, awayScore: away, commentary: 'Goal removed by admin.' });

  return getLiveMatchAdminState(matchId);
}

export async function startMatchPlayback(matchId) {
  const match = await loadMatchRow(matchId);
  if (!match) throw new Error('Match not found');
  if (match.status === 'finished') throw new Error('Match already finished');

  let presetEvents = match.preset_events;
  if (typeof presetEvents === 'string') {
    try { presetEvents = JSON.parse(presetEvents); } catch { presetEvents = []; }
  }

  const manualData =
    presetEvents?.length || match.preset_home_score != null
      ? {
          home_score: match.preset_home_score ?? match.home_score ?? 0,
          away_score: match.preset_away_score ?? match.away_score ?? 0,
          goal_times: Array.isArray(presetEvents) ? presetEvents : [],
        }
      : null;

  await runLiveSimulation(matchId, manualData);
  return getLiveMatchAdminState(matchId);
}

export async function endMatchNow(matchId) {
  stopLiveSimulation(matchId);
  clearLiveOverride(matchId);

  const match = await loadMatchRow(matchId);
  const eventsRes = await pool.query(
    `SELECT me.*, m.home_team_id, m.away_team_id FROM match_events me
     JOIN matches m ON m.id = me.match_id WHERE me.match_id = $1 ORDER BY me.minute`,
    [matchId]
  );

  const goalTimes = eventsRes.rows
    .filter((e) => e.event_type === 'goal')
    .map((e) => ({
      team: e.team_id === e.home_team_id ? 'home' : 'away',
      minute: e.minute,
      type: 'goal',
      player: e.player_name,
      description: e.description,
    }));

  const result = await forceFinishMatch(matchId, {
    home_score: match.home_score,
    away_score: match.away_score,
    goal_times: goalTimes,
  });

  return result;
}

export async function getMatchHistory(limit = 100) {
  const res = await pool.query(
    `SELECT m.*, ht.name AS home_team_name, at.name AS away_team_name,
            ht.short_name AS home_short, at.short_name AS away_short
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.status = 'finished'
     ORDER BY m.finished_at DESC NULLS LAST, m.updated_at DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function saveMatchPreset(matchId, { presetHomeScore, presetAwayScore, goals, events }) {
  const built = events?.length ? buildPresetEvents(events) : buildPresetGoalEvents(goals || []);
  const home = presetHomeScore ?? built.filter((e) => e.team === 'home' && e.type === 'goal').length;
  const away = presetAwayScore ?? built.filter((e) => e.team === 'away' && e.type === 'goal').length;

  await pool.query(
    `UPDATE matches SET preset_home_score = $2, preset_away_score = $3, preset_events = $4, is_manual = TRUE, updated_at = NOW()
     WHERE id = $1`,
    [matchId, home, away, JSON.stringify(built)]
  );

  return getLiveMatchAdminState(matchId);
}

const EVENT_TYPES = ['yellow_card', 'red_card', 'corner', 'foul', 'goal', 'penalty'];

export async function addMatchEvent(matchId, { type, team, minute, player, playerId }) {
  if (!EVENT_TYPES.includes(type)) throw new Error(`Invalid event type: ${type}`);
  const match = await loadMatchRow(matchId);
  if (!match) throw new Error('Match not found');

  const side = team === 'away' ? 'away' : 'home';
  const teamId = side === 'home' ? match.home_team_id : match.away_team_id;
  const min = Math.min(90, Math.max(1, parseInt(minute, 10) || 1));
  const ev = buildSingleEvent({ type, team: side, minute: min, player, playerId });
  const dbType = type === 'penalty' ? 'goal' : type;

  await pool.query(
    `INSERT INTO match_events (match_id, event_type, team_id, minute, player_name, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [matchId, dbType, teamId, min, player || null, ev.description]
  );

  if ((type === 'goal' || type === 'penalty') && playerId) await incrementPlayerGoals(playerId);

  const statUpdates = {};
  if (type === 'goal' || type === 'penalty') {
    const { home, away } = await recalcScoresFromGoals(matchId);
    await pool.query(
      `UPDATE matches SET home_score = $2, away_score = $3, live_minute = GREATEST(live_minute, $4), updated_at = NOW() WHERE id = $1`,
      [matchId, home, away, min]
    );
    setLiveOverride(matchId, { homeScore: home, awayScore: away, minute: min });
    emit(matchId, 'match:goal', { team: side, minute: min, player: player || 'Unknown' });
    statUpdates.homeScore = home;
    statUpdates.awayScore = away;
  } else if (type === 'corner') {
    const col = side === 'home' ? 'corners_home' : 'corners_away';
    await pool.query(`UPDATE matches SET ${col} = ${col} + 1, updated_at = NOW() WHERE id = $1`, [matchId]);
  } else if (type === 'yellow_card') {
    const col = side === 'home' ? 'yellow_cards_home' : 'yellow_cards_away';
    await pool.query(`UPDATE matches SET ${col} = ${col} + 1, updated_at = NOW() WHERE id = $1`, [matchId]);
  } else if (type === 'red_card') {
    const col = side === 'home' ? 'red_cards_home' : 'red_cards_away';
    await pool.query(`UPDATE matches SET ${col} = ${col} + 1, updated_at = NOW() WHERE id = $1`, [matchId]);
  }

  emit(matchId, 'match:ticker', { type: dbType, minute: min, player, team: side });
  emit(matchId, 'match:update', { minute: min, commentary: ev.description, ...statUpdates });

  return getLiveMatchAdminState(matchId);
}

export async function deleteMatchEvent(matchId, eventId) {
  const ev = await pool.query('SELECT * FROM match_events WHERE id = $1 AND match_id = $2', [eventId, matchId]);
  if (!ev.rows[0]) throw new Error('Event not found');
  const row = ev.rows[0];

  await pool.query('DELETE FROM match_events WHERE id = $1', [eventId]);

  if (row.event_type === 'goal') {
    const { home, away } = await recalcScoresFromGoals(matchId);
    await pool.query('UPDATE matches SET home_score = $2, away_score = $3, updated_at = NOW() WHERE id = $1', [matchId, home, away]);
    setLiveOverride(matchId, { homeScore: home, awayScore: away });
    emit(matchId, 'match:update', { homeScore: home, awayScore: away });
  }

  return getLiveMatchAdminState(matchId);
}

export async function forceFullTimeResult(matchId, { homeScore, awayScore }) {
  stopLiveSimulation(matchId);
  await pool.query(
    'UPDATE matches SET home_score = $2, away_score = $3, live_minute = 90, updated_at = NOW() WHERE id = $1',
    [matchId, homeScore, awayScore]
  );
  clearLiveOverride(matchId);

  const eventsRes = await pool.query(
    `SELECT me.*, m.home_team_id, m.away_team_id FROM match_events me
     JOIN matches m ON m.id = me.match_id WHERE me.match_id = $1 ORDER BY me.minute`,
    [matchId]
  );
  const goalTimes = eventsRes.rows
    .filter((e) => e.event_type === 'goal')
    .map((e) => ({
      team: e.team_id === e.home_team_id ? 'home' : 'away',
      minute: e.minute,
      type: 'goal',
      player: e.player_name,
      description: e.description,
    }));

  return forceFinishMatch(matchId, { home_score: homeScore, away_score: awayScore, goal_times: goalTimes });
}

export async function setMatchStatus(matchId, status) {
  const allowed = ['scheduled', 'live', 'finished', 'voided'];
  if (!allowed.includes(status)) throw new Error('Invalid status');
  await pool.query('UPDATE matches SET status = $2, updated_at = NOW() WHERE id = $1', [matchId, status]);
  if (status === 'live') {
    await pool.query('UPDATE matches SET started_at = COALESCE(started_at, NOW()) WHERE id = $1', [matchId]);
  }
  if (status === 'finished') {
    await pool.query('UPDATE matches SET finished_at = COALESCE(finished_at, NOW()), live_minute = 90 WHERE id = $1', [matchId]);
  }
  emit(matchId, 'match:update', { phase: status === 'finished' ? 'fulltime' : status });
  if (status === 'finished') emit(matchId, 'match:finished', { phase: 'fulltime' });
  return getLiveMatchAdminState(matchId);
}

export function emitStatsUpdate() {
  const io = getSchedulerIo();
  if (io) {
    io.emit('league:updated', { ts: Date.now() });
    io.emit('stats:updated', { ts: Date.now() });
  }
}
