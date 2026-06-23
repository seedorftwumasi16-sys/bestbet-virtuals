import pool from '../db/pool.js';
import { updateLeaguePositions } from './leagueService.js';
import { settleBetsForMatch } from './bettingService.js';
import { getSetting } from './settingsService.js';
import { getMatchIntervalMs, getSimulationTickMs } from './matchIntervalService.js';
import { simulateMatchOutcome, COMMENTARY, pick } from './simulationService.js';
import { incrementPlayerGoals } from './playerService.js';
import {
  generateNextMatches,
  startMatch,
  getMatchWithDetails,
} from './matchEngine.js';

let io = null;
let matchCycleTimer = null;
let liveSimulationTimers = {};
let processingScheduled = false;
const liveStateOverrides = new Map();

export function getSchedulerIo() {
  return io;
}

export function stopLiveSimulation(matchId) {
  if (liveSimulationTimers[matchId]) {
    clearInterval(liveSimulationTimers[matchId]);
    delete liveSimulationTimers[matchId];
  }
}

export function setLiveOverride(matchId, data) {
  liveStateOverrides.set(matchId, { ...liveStateOverrides.get(matchId), ...data });
}

export function clearLiveOverride(matchId) {
  liveStateOverrides.delete(matchId);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function initMatchScheduler(socketIo) {
  io = socketIo;
  startMatchCycle();
}

async function startMatchCycle() {
  let intervalMs = 120_000;
  try {
    const paused = await getSetting('competition_paused', 'false');
    if (paused !== 'true') {
      const res = await pool.query(
        `SELECT COUNT(*) as cnt FROM matches WHERE status IN ('scheduled', 'live')`
      );
      if (parseInt(res.rows[0].cnt, 10) === 0) {
        await generateNextMatches();
      }
    }
    intervalMs = await getMatchIntervalMs();
  } catch (err) {
    console.error('Match cycle error:', err.message);
  }

  matchCycleTimer = setTimeout(startMatchCycle, intervalMs);
}

export async function recoverStuckMatches() {
  try {
    const staleScheduled = await pool.query(
      `SELECT id FROM matches WHERE status = 'scheduled' AND scheduled_at < NOW() - INTERVAL '30 seconds' AND is_paused = false`
    );
    for (const row of staleScheduled.rows) {
      if (!liveSimulationTimers[row.id]) {
        await runLiveSimulation(row.id);
      }
    }

    const staleLive = await pool.query(
      `SELECT id FROM matches WHERE status = 'live' AND started_at < NOW() - INTERVAL '4 minutes'`
    );
    for (const row of staleLive.rows) {
      if (liveSimulationTimers[row.id]) {
        clearInterval(liveSimulationTimers[row.id]);
        delete liveSimulationTimers[row.id];
      }
      await forceFinishStuck(row.id);
    }
  } catch (err) {
    console.error('Recover stuck matches:', err.message);
  }
}

async function forceFinishStuck(matchId) {
  const matchRes = await pool.query(
    `SELECT m.*, ht.name as home_name, at.name as away_name
     FROM matches m JOIN teams ht ON m.home_team_id = ht.id JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [matchId]
  );
  const match = matchRes.rows[0];
  if (!match) return;

  const outcome = await simulateMatchOutcome(match.home_team_id, match.away_team_id);
  await finalizeMatch(matchId, match, outcome.homeGoals, outcome.awayGoals, outcome.events, outcome.possessionHome);
}

export async function processScheduledMatches() {
  if (processingScheduled) return;
  processingScheduled = true;
  try {
    await recoverStuckMatches();

    const paused = await getSetting('competition_paused', 'false');
    if (paused === 'true') return;

    const res = await pool.query(
      `SELECT id, preset_events, preset_home_score, preset_away_score FROM matches
       WHERE status = 'scheduled' AND scheduled_at <= NOW() AND is_paused = false`
    );

    for (const row of res.rows) {
      if (liveSimulationTimers[row.id]) continue;
      let presetEvents = row.preset_events;
      if (typeof presetEvents === 'string') {
        try { presetEvents = JSON.parse(presetEvents); } catch { presetEvents = []; }
      }
      const hasPreset = Array.isArray(presetEvents) && presetEvents.length > 0;
      const manualData = hasPreset
        ? {
            home_score: row.preset_home_score ?? presetEvents.filter((e) => e.team === 'home').length,
            away_score: row.preset_away_score ?? presetEvents.filter((e) => e.team === 'away').length,
            goal_times: presetEvents,
          }
        : null;
      await runLiveSimulation(row.id, manualData);
    }
  } catch (err) {
    console.error('Scheduler error:', err.message);
  } finally {
    processingScheduled = false;
  }
}

export async function runLiveSimulation(matchId, manualData = null) {
  if (liveSimulationTimers[matchId]) return;

  const manualMode = await getSetting('manual_mode', 'false');
  if (manualMode === 'true' && !manualData) {
    await startMatch(matchId);
    if (io) io.emit('match:live', { matchId, phase: 'walkout' });
    return;
  }

  await startMatch(matchId);
  if (io) io.emit('match:live', { matchId, phase: 'walkout' });

  const matchRes = await pool.query(
    `SELECT m.*, ht.name as home_name, at.name as away_name
     FROM matches m JOIN teams ht ON m.home_team_id = ht.id JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [matchId]
  );
  const match = matchRes.rows[0];
  if (!match) return;

  let homeScore, awayScore, events, possessionHome;
  if (manualData) {
    homeScore = manualData.home_score;
    awayScore = manualData.away_score;
    events = manualData.goal_times || [];
    possessionHome = 50;
  } else {
    const outcome = await simulateMatchOutcome(match.home_team_id, match.away_team_id);
    homeScore = outcome.homeGoals;
    awayScore = outcome.awayGoals;
    events = outcome.events;
    possessionHome = outcome.possessionHome;
  }

  let currentMinute = 0;
  let liveHomeScore = 0;
  let liveAwayScore = 0;
  let phase = 'walkout';
  let walkoutTicks = 0;
  let halftimePause = false;
  const liveStats = {
    cornersHome: 0, cornersAway: 0, yellowHome: 0, yellowAway: 0,
    redHome: 0, redAway: 0, foulsHome: 0, foulsAway: 0,
    shotsHome: 0, shotsAway: 0, shotsOnTargetHome: 0, shotsOnTargetAway: 0,
    xgHome: 0, xgAway: 0,
  };
  let attackDirection = 'home';

  const tick = async () => {
    try {
      const pausedRow = await pool.query('SELECT is_paused, admin_commentary FROM matches WHERE id = $1', [matchId]);
      if (pausedRow.rows[0]?.is_paused) return;

      const override = liveStateOverrides.get(matchId) || {};

      if (phase === 'walkout') {
        walkoutTicks += 1;
        if (walkoutTicks < 2) {
          if (io) io.emit('match:update', { matchId, phase: 'walkout', commentary: 'Teams walk out onto the pitch...' });
          return;
        }
        phase = 'kickoff';
        if (io) io.emit('match:update', { matchId, phase: 'kickoff', commentary: pick(COMMENTARY.kickoff) });
        return;
      }

      if (phase === 'kickoff') {
        phase = 'first_half';
        currentMinute = 0;
        if (io) io.emit('match:update', { matchId, phase: 'first_half', minute: 0, commentary: pick(COMMENTARY.kickoff) });
        return;
      }

      if (halftimePause) {
        halftimePause = false;
        phase = 'second_half';
        currentMinute = 45;
        if (io) io.emit('match:update', { matchId, phase: 'second_half', minute: 45, commentary: pick(COMMENTARY.secondhalf) });
        return;
      }

      if (override.minute !== undefined) {
        currentMinute = override.minute;
      } else {
        currentMinute += 1;
      }
      if (currentMinute > 90) currentMinute = 90;

      if (override.homeScore !== undefined) liveHomeScore = override.homeScore;
      if (override.awayScore !== undefined) liveAwayScore = override.awayScore;

      if (Math.random() < 0.35) {
        const shooter = Math.random() < possessionHome / 100 ? 'home' : 'away';
        attackDirection = shooter;
        liveStats[shooter === 'home' ? 'shotsHome' : 'shotsAway']++;
        const onTarget = Math.random() < 0.42;
        if (onTarget) {
          liveStats[shooter === 'home' ? 'shotsOnTargetHome' : 'shotsOnTargetAway']++;
          liveStats[shooter === 'home' ? 'xgHome' : 'xgAway'] += Math.round((0.05 + Math.random() * 0.18) * 100) / 100;
        }
      }

      const minuteEvents = events.filter((e) => e.minute === currentMinute);
      const commentaryLines = [];

      for (const e of minuteEvents) {
        if (e.type === 'halftime') {
          phase = 'halftime';
          halftimePause = true;
          commentaryLines.push(e.description);
          if (io) io.emit('match:update', { matchId, phase: 'halftime', minute: 45, commentary: e.description });
          continue;
        }
        if (e.type === 'second_half' || e.type === 'kickoff' || e.type === 'fulltime') continue;

        const teamId = e.team === 'home' ? match.home_team_id : match.away_team_id;
        if (e.type === 'goal') {
          if (e.team === 'home') liveHomeScore++;
          else liveAwayScore++;
          attackDirection = e.team;
          liveStats[e.team === 'home' ? 'shotsHome' : 'shotsAway']++;
          liveStats[e.team === 'home' ? 'shotsOnTargetHome' : 'shotsOnTargetAway']++;
          liveStats[e.team === 'home' ? 'xgHome' : 'xgAway'] += 0.35;
          if (e.playerId) await incrementPlayerGoals(e.playerId);
          if (io) io.emit('match:goal', { matchId, team: e.team, minute: currentMinute, player: e.player });
          if (io) io.emit('match:ticker', { matchId, type: 'goal', minute: currentMinute, player: e.player, team: e.team });
        }
        if (e.type === 'corner') {
          if (e.team === 'home') liveStats.cornersHome++;
          else liveStats.cornersAway++;
          attackDirection = e.team;
          if (io) io.emit('match:ticker', { matchId, type: 'corner', minute: currentMinute, team: e.team });
        }
        if (e.type === 'yellow_card') {
          if (e.team === 'home') liveStats.yellowHome++;
          else liveStats.yellowAway++;
          if (io) io.emit('match:ticker', { matchId, type: 'yellow_card', minute: currentMinute, team: e.team });
        }
        if (e.type === 'red_card') {
          if (e.team === 'home') liveStats.redHome++;
          else liveStats.redAway++;
          if (io) io.emit('match:ticker', { matchId, type: 'red_card', minute: currentMinute, team: e.team });
        }
        if (e.type === 'foul') {
          if (e.team === 'home') liveStats.foulsHome++;
          else liveStats.foulsAway++;
          if (io) io.emit('match:ticker', { matchId, type: 'foul', minute: currentMinute, team: e.team });
        }
        if (e.type === 'substitution') {
          if (io) io.emit('match:ticker', { matchId, type: 'substitution', minute: currentMinute, team: e.team });
        }

        if (['goal', 'yellow_card', 'red_card', 'corner', 'foul', 'injury', 'substitution'].includes(e.type)) {
          await pool.query(
            `INSERT INTO match_events (match_id, event_type, team_id, minute, player_name, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [matchId, e.type, teamId, e.minute, e.player || null, e.description]
          );
          commentaryLines.push(e.description);
        }
      }

      const displayPhase = phase === 'halftime' ? 'halftime' : currentMinute <= 45 ? 'first_half' : 'second_half';

      await pool.query(
        `UPDATE matches SET home_score = $2, away_score = $3, possession_home = $4, possession_away = $5,
         corners_home = $6, corners_away = $7, yellow_cards_home = $8, yellow_cards_away = $9,
         red_cards_home = $10, red_cards_away = $11, fouls_home = $12, fouls_away = $13,
         shots_home = $14, shots_away = $15, shots_on_target_home = $16, shots_on_target_away = $17,
         xg_home = $18, xg_away = $19, live_minute = $20, updated_at = NOW()
         WHERE id = $1`,
        [
          matchId, liveHomeScore, liveAwayScore, possessionHome, 100 - possessionHome,
          liveStats.cornersHome, liveStats.cornersAway, liveStats.yellowHome, liveStats.yellowAway,
          liveStats.redHome, liveStats.redAway, liveStats.foulsHome, liveStats.foulsAway,
          liveStats.shotsHome, liveStats.shotsAway, liveStats.shotsOnTargetHome, liveStats.shotsOnTargetAway,
          Math.round(liveStats.xgHome * 100) / 100, Math.round(liveStats.xgAway * 100) / 100,
          currentMinute,
        ]
      );

      const adminCommentary = pausedRow.rows[0]?.admin_commentary;
      const commentaryText = adminCommentary || commentaryLines.join(' | ');

      if (io && !halftimePause) {
        io.emit('match:update', {
          matchId,
          minute: currentMinute,
          phase: displayPhase,
          homeScore: liveHomeScore,
          awayScore: liveAwayScore,
          events: minuteEvents,
          commentary: commentaryText,
          attackDirection,
          possessionHome,
          possessionAway: 100 - possessionHome,
          stats: liveStats,
        });
      }

      if (currentMinute >= 90 && !halftimePause) {
        clearInterval(liveSimulationTimers[matchId]);
        delete liveSimulationTimers[matchId];
        clearLiveOverride(matchId);
        await finalizeMatch(matchId, match, liveHomeScore, liveAwayScore, events, possessionHome, liveStats);
      }
    } catch (err) {
      console.error(`Simulation tick error (${matchId}):`, err.message);
      if (err.code === '53100') {
        clearInterval(liveSimulationTimers[matchId]);
        delete liveSimulationTimers[matchId];
      }
    }
  };

  const tickMs = await getSimulationTickMs();
  liveSimulationTimers[matchId] = setInterval(tick, tickMs);
  tick();
}

async function finalizeMatch(matchId, match, homeScore, awayScore, events, possessionHome = 50, liveStats = null) {
  let htHome = 0;
  let htAway = 0;
  let firstGoalTeamId = null;
  let lastGoalTeamId = null;
  let firstGoalScorer = null;

  for (const e of events) {
    if (e.type === 'goal') {
      const teamId = e.team === 'home' ? match.home_team_id : match.away_team_id;
      if (!firstGoalTeamId) {
        firstGoalTeamId = teamId;
        firstGoalScorer = e.player;
      }
      lastGoalTeamId = teamId;
      if (e.minute <= 45) {
        if (e.team === 'home') htHome++;
        else htAway++;
      }
    }
  }

  const shotsHome = liveStats?.shotsHome ?? randomInt(5, 18);
  const shotsAway = liveStats?.shotsAway ?? randomInt(3, 15);
  const sotHome = liveStats?.shotsOnTargetHome ?? randomInt(2, 8);
  const sotAway = liveStats?.shotsOnTargetAway ?? randomInt(1, 6);
  const xgHome = liveStats ? Math.round(liveStats.xgHome * 100) / 100 : Math.round((homeScore + randomInt(0, 3)) * 0.35 * 100) / 100;
  const xgAway = liveStats ? Math.round(liveStats.xgAway * 100) / 100 : Math.round((awayScore + randomInt(0, 3)) * 0.35 * 100) / 100;
  const cornersHome = events.filter((e) => e.type === 'corner' && e.team === 'home').length;
  const cornersAway = events.filter((e) => e.type === 'corner' && e.team === 'away').length;
  const yellowHome = events.filter((e) => e.type === 'yellow_card' && e.team === 'home').length;
  const yellowAway = events.filter((e) => e.type === 'yellow_card' && e.team === 'away').length;
  const redHome = events.filter((e) => e.type === 'red_card' && e.team === 'home').length;
  const redAway = events.filter((e) => e.type === 'red_card' && e.team === 'away').length;
  const foulsHome = events.filter((e) => e.type === 'foul' && e.team === 'home').length;
  const foulsAway = events.filter((e) => e.type === 'foul' && e.team === 'away').length;

  await pool.query(
    `UPDATE matches SET
      status = 'finished', finished_at = NOW(),
      home_score = $2, away_score = $3,
      half_time_home = $4, half_time_away = $5,
      possession_home = $6, possession_away = $7,
      shots_home = $8, shots_away = $9,
      shots_on_target_home = $10, shots_on_target_away = $11,
      xg_home = $12, xg_away = $13,
      corners_home = $14, corners_away = $15,
      yellow_cards_home = $16, yellow_cards_away = $17,
      red_cards_home = $18, red_cards_away = $19,
      fouls_home = $20, fouls_away = $21,
      first_goal_team_id = $22, last_goal_team_id = $23,
      first_goal_scorer = $24, live_minute = 90, updated_at = NOW()
     WHERE id = $1`,
    [
      matchId, homeScore, awayScore, htHome, htAway,
      possessionHome, 100 - possessionHome,
      shotsHome, shotsAway, sotHome, sotAway, xgHome, xgAway,
      cornersHome, cornersAway,
      yellowHome, yellowAway, redHome, redAway,
      foulsHome, foulsAway, firstGoalTeamId, lastGoalTeamId, firstGoalScorer,
    ]
  );

  const updateTeam = async (teamId, gf, ga, won, drawn, lost) => {
    await pool.query(
      `UPDATE league_table SET played = played + 1, won = won + $2, drawn = drawn + $3, lost = lost + $4,
       goals_for = goals_for + $5, goals_against = goals_against + $6, points = points + $2 * 3 + $3, updated_at = NOW()
       WHERE team_id = $1`,
      [teamId, won, drawn, lost, gf, ga]
    );
  };

  if (homeScore > awayScore) {
    await updateTeam(match.home_team_id, homeScore, awayScore, 1, 0, 0);
    await updateTeam(match.away_team_id, awayScore, homeScore, 0, 0, 1);
  } else if (homeScore < awayScore) {
    await updateTeam(match.home_team_id, homeScore, awayScore, 0, 0, 1);
    await updateTeam(match.away_team_id, awayScore, homeScore, 1, 0, 0);
  } else {
    await updateTeam(match.home_team_id, homeScore, awayScore, 0, 1, 0);
    await updateTeam(match.away_team_id, awayScore, homeScore, 0, 1, 0);
  }

  const homeResult = homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D';
  const awayResult = awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D';
  await pool.query(
    `INSERT INTO team_form (team_id, match_id, result, goals_for, goals_against) VALUES ($1, $2, $3, $4, $5)`,
    [match.home_team_id, matchId, homeResult, homeScore, awayScore]
  );
  await pool.query(
    `INSERT INTO team_form (team_id, match_id, result, goals_for, goals_against) VALUES ($1, $2, $3, $4, $5)`,
    [match.away_team_id, matchId, awayResult, awayScore, homeScore]
  );

  const leagueRes = await pool.query('SELECT league FROM teams WHERE id = $1', [match.home_team_id]);
  await updateLeaguePositions(leagueRes.rows[0]?.league);

  await pool.query(
    `UPDATE season_fixtures SET is_played = TRUE, match_id = $2 WHERE match_id = $1 OR (home_team_id = $3 AND away_team_id = $4 AND is_played = FALSE)`,
    [matchId, matchId, match.home_team_id, match.away_team_id]
  );

  await settleBetsForMatch(matchId);
  const finalMatch = await getMatchWithDetails(matchId);

  if (io) io.emit('match:finished', { matchId, match: finalMatch, phase: 'fulltime' });
  await generateNextMatches();
}

export async function forceFinishMatch(matchId, manualData) {
  stopLiveSimulation(matchId);
  clearLiveOverride(matchId);
  const matchRes = await pool.query(
    `SELECT m.*, ht.name as home_name, at.name as away_name
     FROM matches m JOIN teams ht ON m.home_team_id = ht.id JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [matchId]
  );
  const match = matchRes.rows[0];
  await finalizeMatch(matchId, match, manualData.home_score, manualData.away_score, manualData.goal_times || [], 50);
  return await getMatchWithDetails(matchId);
}

export function stopScheduler() {
  if (matchCycleTimer) clearTimeout(matchCycleTimer);
  Object.values(liveSimulationTimers).forEach(clearInterval);
}
