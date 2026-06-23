import pool from '../db/pool.js';
import { updateLeaguePositions } from './leagueService.js';
import { settleBetsForMatch } from './bettingService.js';
import { getSetting } from './settingsService.js';
import { randomPlayerName } from './oddsService.js';
import { getMatchIntervalMs, getSimulationTickMs } from './matchIntervalService.js';
import {
  generateNextMatches,
  startMatch,
  getMatchWithDetails,
} from './matchEngine.js';

let io = null;
let matchCycleTimer = null;
let liveSimulationTimers = {};
let processingScheduled = false;

const COMMENTARY = {
  goal: ['GOAL! What a finish!', 'GOOOAL! The crowd erupts!', 'Into the net! Brilliant strike!', 'Scores! The stadium is alive!'],
  yellow: ['Yellow card shown.', 'Caution for the player.', 'Booked for dissent.'],
  red: ['RED CARD! Sent off!', 'Dismissed! Huge moment in the match!'],
  foul: ['Free kick awarded.', 'Challenge deemed foul.', 'Play stopped for infringement.'],
  corner: ['Corner kick.', 'Corner for the attacking side.'],
  kickoff: ['KICK OFF! The match is underway!', 'And we are LIVE!'],
  halftime: ['Half time. Teams regroup.', 'HALF TIME whistle blows.'],
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function preGenerateFullMatch(homeGoals, awayGoals, homeName, awayName) {
  const events = [];
  for (let i = 0; i < homeGoals; i++) {
    const player = randomPlayerName();
    events.push({
      team: 'home', minute: randomInt(1, 90), type: 'goal',
      player, description: `⚽ GOAL! ${homeName} - ${player} scores! ${pick(COMMENTARY.goal)}`,
    });
  }
  for (let i = 0; i < awayGoals; i++) {
    const player = randomPlayerName();
    events.push({
      team: 'away', minute: randomInt(1, 90), type: 'goal',
      player, description: `⚽ GOAL! ${awayName} - ${player} scores! ${pick(COMMENTARY.goal)}`,
    });
  }
  for (let i = 0; i < randomInt(2, 6); i++) {
    const team = pick(['home', 'away']);
    events.push({
      team, minute: randomInt(1, 90), type: 'yellow_card',
      description: `🟨 ${pick(COMMENTARY.yellow)}`,
    });
  }
  for (let i = 0; i < randomInt(0, 2); i++) {
    const team = pick(['home', 'away']);
    events.push({
      team, minute: randomInt(1, 90), type: 'red_card',
      description: `🟥 ${pick(COMMENTARY.red)}`,
    });
  }
  for (let i = 0; i < randomInt(4, 12); i++) {
    const team = pick(['home', 'away']);
    events.push({ team, minute: randomInt(1, 90), type: 'foul', description: pick(COMMENTARY.foul) });
  }
  for (let i = 0; i < randomInt(3, 10); i++) {
    const team = pick(['home', 'away']);
    events.push({ team, minute: randomInt(1, 90), type: 'corner', description: pick(COMMENTARY.corner) });
  }
  events.push({ team: 'home', minute: 0, type: 'kickoff', description: pick(COMMENTARY.kickoff) });
  events.push({ team: 'home', minute: 45, type: 'halftime', description: pick(COMMENTARY.halftime) });
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

export function initMatchScheduler(socketIo) {
  io = socketIo;
  startMatchCycle();
}

async function startMatchCycle() {
  try {
    const paused = await getSetting('competition_paused', 'false');
    if (paused === 'true') return;

    const res = await pool.query(
      `SELECT COUNT(*) as cnt FROM matches WHERE status IN ('scheduled', 'live')`
    );
    if (parseInt(res.rows[0].cnt) === 0) {
      await generateNextMatches();
    }
  } catch (err) {
    console.error('Match cycle error:', err);
  }

  const intervalMs = await getMatchIntervalMs();
  matchCycleTimer = setTimeout(startMatchCycle, intervalMs);
}

export async function processScheduledMatches() {
  if (processingScheduled) return;
  processingScheduled = true;
  try {
    const paused = await getSetting('competition_paused', 'false');
    if (paused === 'true') return;

    let res;
    try {
      res = await pool.query(
        `SELECT id FROM matches WHERE status = 'scheduled' AND scheduled_at <= NOW() AND is_paused = false`
      );
    } catch {
      res = await pool.query(
        `SELECT id FROM matches WHERE status = 'scheduled' AND scheduled_at <= NOW()`
      );
    }

    for (const row of res.rows) {
      if (liveSimulationTimers[row.id]) continue;
      await runLiveSimulation(row.id);
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

  let homeScore, awayScore, events;
  if (manualData) {
    homeScore = manualData.home_score;
    awayScore = manualData.away_score;
    events = manualData.goal_times || preGenerateFullMatch(homeScore, awayScore, match.home_name, match.away_name);
  } else {
    homeScore = randomInt(0, 4);
    awayScore = randomInt(0, 3);
    events = preGenerateFullMatch(homeScore, awayScore, match.home_name, match.away_name);
  }

  let currentMinute = 0;
  let liveHomeScore = 0;
  let liveAwayScore = 0;
  let phase = 'walkout';
  const possessionHome = randomInt(35, 65);
  let liveStats = { cornersHome: 0, cornersAway: 0, yellowHome: 0, yellowAway: 0, redHome: 0, redAway: 0, foulsHome: 0, foulsAway: 0 };

  const tick = async () => {
    try {
    if (phase === 'walkout') {
      phase = 'kickoff';
      if (io) io.emit('match:update', { matchId, phase: 'kickoff', commentary: 'Teams walk out onto the pitch...' });
      return;
    }

    currentMinute += 1;
    if (currentMinute === 1 && phase === 'kickoff') {
      phase = 'live';
      if (io) io.emit('match:update', { matchId, phase: 'live', minute: 0, commentary: pick(COMMENTARY.kickoff) });
    }

    const minuteEvents = events.filter((e) => e.minute === currentMinute);
    const commentaryLines = [];

    for (const e of minuteEvents) {
      const teamId = e.team === 'home' ? match.home_team_id : match.away_team_id;
      if (e.type === 'goal') {
        if (e.team === 'home') liveHomeScore++;
        else liveAwayScore++;
        if (io) io.emit('match:goal', { matchId, team: e.team, minute: currentMinute });
      }
      if (e.type === 'corner') {
        if (e.team === 'home') liveStats.cornersHome++;
        else liveStats.cornersAway++;
      }
      if (e.type === 'yellow_card') {
        if (e.team === 'home') liveStats.yellowHome++;
        else liveStats.yellowAway++;
      }
      if (e.type === 'red_card') {
        if (e.team === 'home') liveStats.redHome++;
        else liveStats.redAway++;
      }
      if (e.type === 'foul') {
        if (e.team === 'home') liveStats.foulsHome++;
        else liveStats.foulsAway++;
      }

      if (['goal', 'yellow_card', 'red_card', 'corner', 'foul', 'halftime'].includes(e.type)) {
        await pool.query(
          `INSERT INTO match_events (match_id, event_type, team_id, minute, player_name, description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [matchId, e.type, teamId, e.minute, e.player || null, e.description]
        );
        commentaryLines.push(e.description);
      }
    }

    await pool.query(
      `UPDATE matches SET home_score = $2, away_score = $3, possession_home = $4, possession_away = $5,
       corners_home = $6, corners_away = $7, yellow_cards_home = $8, yellow_cards_away = $9,
       red_cards_home = $10, red_cards_away = $11, fouls_home = $12, fouls_away = $13, updated_at = NOW()
       WHERE id = $1`,
      [
        matchId, liveHomeScore, liveAwayScore, possessionHome, 100 - possessionHome,
        liveStats.cornersHome, liveStats.cornersAway, liveStats.yellowHome, liveStats.yellowAway,
        liveStats.redHome, liveStats.redAway, liveStats.foulsHome, liveStats.foulsAway,
      ]
    );

    if (io) {
      io.emit('match:update', {
        matchId, minute: currentMinute, phase: 'live',
        homeScore: liveHomeScore, awayScore: liveAwayScore,
        events: minuteEvents, commentary: commentaryLines.join(' | '),
        stats: liveStats,
      });
    }

    if (currentMinute >= 90) {
      clearInterval(liveSimulationTimers[matchId]);
      delete liveSimulationTimers[matchId];
      await finalizeMatch(matchId, match, homeScore, awayScore, events);
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
}

async function finalizeMatch(matchId, match, homeScore, awayScore, events) {
  let htHome = 0, htAway = 0;
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

  const shotsHome = randomInt(5, 18);
  const shotsAway = randomInt(3, 15);
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
      shots_home = $6, shots_away = $7,
      corners_home = $8, corners_away = $9,
      yellow_cards_home = $10, yellow_cards_away = $11,
      red_cards_home = $12, red_cards_away = $13,
      fouls_home = $14, fouls_away = $15,
      first_goal_team_id = $16, last_goal_team_id = $17,
      first_goal_scorer = $18, updated_at = NOW()
     WHERE id = $1`,
    [
      matchId, homeScore, awayScore, htHome, htAway,
      shotsHome, shotsAway, cornersHome, cornersAway,
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

  await updateLeaguePositions();

  await settleBetsForMatch(matchId);
  const finalMatch = await getMatchWithDetails(matchId);

  if (io) io.emit('match:finished', { matchId, match: finalMatch, phase: 'finished' });
  await generateNextMatches();
}

export async function forceFinishMatch(matchId, manualData) {
  if (liveSimulationTimers[matchId]) {
    clearInterval(liveSimulationTimers[matchId]);
    delete liveSimulationTimers[matchId];
  }
  const matchRes = await pool.query(
    `SELECT m.*, ht.name as home_name, at.name as away_name
     FROM matches m JOIN teams ht ON m.home_team_id = ht.id JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [matchId]
  );
  const match = matchRes.rows[0];
  const events = manualData.goal_times || preGenerateFullMatch(
    manualData.home_score, manualData.away_score, match.home_name, match.away_name
  );
  await finalizeMatch(matchId, match, manualData.home_score, manualData.away_score, events);
  return await getMatchWithDetails(matchId);
}

export function stopScheduler() {
  if (matchCycleTimer) clearTimeout(matchCycleTimer);
  Object.values(liveSimulationTimers).forEach(clearInterval);
}
