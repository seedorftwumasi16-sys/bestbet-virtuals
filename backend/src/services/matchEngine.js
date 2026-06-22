import pool from '../db/pool.js';
import { generateMatchOdds } from './oddsService.js';
import { getSetting } from './settingsService.js';
import { updateLeaguePositions } from './leagueService.js';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simulateGoals(manualScore = null) {
  if (manualScore) return { home: manualScore.home, away: manualScore.away };

  const homeGoals = randomInt(0, 4);
  const awayGoals = randomInt(0, 3);
  return { home: homeGoals, away: awayGoals };
}

function generateGoalTimes(homeGoals, awayGoals, manualTimes = null) {
  const events = [];
  if (manualTimes) return manualTimes;

  for (let i = 0; i < homeGoals; i++) {
    events.push({ team: 'home', minute: randomInt(1, 90), type: 'goal' });
  }
  for (let i = 0; i < awayGoals; i++) {
    events.push({ team: 'away', minute: randomInt(1, 90), type: 'goal' });
  }
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

function calcHalfTime(events) {
  let htHome = 0, htAway = 0;
  events.forEach((e) => {
    if (e.minute <= 45 && e.type === 'goal') {
      if (e.team === 'home') htHome++;
      else htAway++;
    }
  });
  return { home: htHome, away: htAway };
}

export async function createScheduledMatch(homeTeamId, awayTeamId, scheduledAt) {
  const teams = await pool.query(
    'SELECT id, strength FROM teams WHERE id IN ($1, $2)',
    [homeTeamId, awayTeamId]
  );
  const homeTeam = teams.rows.find((t) => t.id === homeTeamId);
  const awayTeam = teams.rows.find((t) => t.id === awayTeamId);
  const homeStr = homeTeam?.strength || 50;
  const awayStr = awayTeam?.strength || 50;

  const res = await pool.query(
    `INSERT INTO matches (home_team_id, away_team_id, scheduled_at, status)
     VALUES ($1, $2, $3, 'scheduled') RETURNING *`,
    [homeTeamId, awayTeamId, scheduledAt]
  );
  const match = res.rows[0];
  const odds = generateMatchOdds(homeStr, awayStr);
  for (const o of odds) {
    await pool.query(
      `INSERT INTO match_odds (match_id, market, selection, odds) VALUES ($1, $2, $3, $4)`,
      [match.id, o.market, o.selection, o.odds]
    );
  }
  return match;
}

export async function generateNextMatches() {
  const teamsRes = await pool.query('SELECT id FROM teams WHERE is_active = TRUE ORDER BY RANDOM()');
  const teams = teamsRes.rows;
  if (teams.length < 2) return [];

  const interval = parseInt(await getSetting('match_interval_minutes', '3'));
  const scheduledAt = new Date(Date.now() + interval * 60 * 1000);
  const matches = [];

  const used = new Set();
  for (let i = 0; i < Math.min(4, Math.floor(teams.length / 2)); i++) {
    let home, away;
    do {
      home = teams[randomInt(0, teams.length - 1)];
      away = teams[randomInt(0, teams.length - 1)];
    } while (home.id === away.id || used.has(home.id) || used.has(away.id));

    used.add(home.id);
    used.add(away.id);
    const match = await createScheduledMatch(home.id, away.id, scheduledAt);
    matches.push(match);
  }
  return matches;
}

export async function startMatch(matchId) {
  await pool.query(
    `UPDATE matches SET status = 'live', started_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [matchId]
  );
}

export async function simulateMatch(matchId, manualData = null) {
  const matchRes = await pool.query(
    `SELECT m.*, ht.name as home_name, at.name as away_name
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [matchId]
  );
  if (!matchRes.rows[0]) throw new Error('Match not found');
  const match = matchRes.rows[0];

  let homeScore, awayScore, events, firstGoalTeamId = null;

  if (manualData) {
    homeScore = manualData.home_score;
    awayScore = manualData.away_score;
    events = manualData.goal_times || generateGoalTimes(homeScore, awayScore);
  } else {
    const scores = simulateGoals();
    homeScore = scores.home;
    awayScore = scores.away;
    events = generateGoalTimes(homeScore, awayScore);
  }

  const ht = calcHalfTime(events);
  const possessionHome = randomInt(35, 65);
  const shotsHome = randomInt(5, 18);
  const shotsAway = randomInt(3, 15);
  const cornersHome = randomInt(2, 10);
  const cornersAway = randomInt(1, 8);
  const yellowHome = randomInt(0, 3);
  const yellowAway = randomInt(0, 3);

  for (const e of events) {
    const teamId = e.team === 'home' ? match.home_team_id : match.away_team_id;
    if (e.type === 'goal' && !firstGoalTeamId) firstGoalTeamId = teamId;
    await pool.query(
      `INSERT INTO match_events (match_id, event_type, team_id, minute, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [matchId, e.type, teamId, e.minute, `${e.type} at ${e.minute}'`]
    );
  }

  await pool.query(
    `UPDATE matches SET
      status = 'finished', finished_at = NOW(),
      home_score = $2, away_score = $3,
      half_time_home = $4, half_time_away = $5,
      possession_home = $6, possession_away = $7,
      shots_home = $8, shots_away = $9,
      corners_home = $10, corners_away = $11,
      yellow_cards_home = $12, yellow_cards_away = $13,
      first_goal_team_id = $14, is_manual = $15, updated_at = NOW()
     WHERE id = $1`,
    [
      matchId, homeScore, awayScore, ht.home, ht.away,
      possessionHome, 100 - possessionHome, shotsHome, shotsAway,
      cornersHome, cornersAway, yellowHome, yellowAway,
      firstGoalTeamId, manualData ? true : false,
    ]
  );

  await updateLeagueTable(match.home_team_id, match.away_team_id, homeScore, awayScore);
  await updateTeamForm(match.home_team_id, matchId, homeScore, awayScore, true);
  await updateTeamForm(match.away_team_id, matchId, awayScore, homeScore, false);

  return { homeScore, awayScore, events, ht };
}

async function updateLeagueTable(homeId, awayId, homeScore, awayScore) {
  const updateTeam = async (teamId, gf, ga, won, drawn, lost) => {
    await pool.query(
      `UPDATE league_table SET
        played = played + 1, won = won + $2, drawn = drawn + $3, lost = lost + $4,
        goals_for = goals_for + $5, goals_against = goals_against + $6,
        points = points + $2 * 3 + $3, updated_at = NOW()
       WHERE team_id = $1`,
      [teamId, won, drawn, lost, gf, ga]
    );
  };

  if (homeScore > awayScore) {
    await updateTeam(homeId, homeScore, awayScore, 1, 0, 0);
    await updateTeam(awayId, awayScore, homeScore, 0, 0, 1);
  } else if (homeScore < awayScore) {
    await updateTeam(homeId, homeScore, awayScore, 0, 0, 1);
    await updateTeam(awayId, awayScore, homeScore, 1, 0, 0);
  } else {
    await updateTeam(homeId, homeScore, awayScore, 0, 1, 0);
    await updateTeam(awayId, awayScore, homeScore, 0, 1, 0);
  }

  await updateLeaguePositions();
}

async function updateTeamForm(teamId, matchId, gf, ga, isHome) {
  let result = 'D';
  if (gf > ga) result = 'W';
  else if (gf < ga) result = 'L';
  await pool.query(
    `INSERT INTO team_form (team_id, match_id, result, goals_for, goals_against) VALUES ($1, $2, $3, $4, $5)`,
    [teamId, matchId, result, gf, ga]
  );
}

export async function getMatchWithDetails(matchId) {
  const matchRes = await pool.query(
    `SELECT m.*,
      ht.name as home_team_name, ht.short_name as home_short, ht.logo_url as home_logo,
      at.name as away_team_name, at.short_name as away_short, at.logo_url as away_logo
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.id = $1`,
    [matchId]
  );
  const oddsRes = await pool.query('SELECT * FROM match_odds WHERE match_id = $1 AND is_active = TRUE', [matchId]);
  const eventsRes = await pool.query(
    `SELECT me.*, t.name as team_name FROM match_events me
     LEFT JOIN teams t ON me.team_id = t.id WHERE me.match_id = $1 ORDER BY me.minute`,
    [matchId]
  );
  return { match: matchRes.rows[0], odds: oddsRes.rows, events: eventsRes.rows };
}

export async function getUpcomingMatches() {
  const res = await pool.query(
    `SELECT m.*,
      ht.name as home_team_name, ht.short_name as home_short, ht.logo_url as home_logo,
      at.name as away_team_name, at.short_name as away_short, at.logo_url as away_logo
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.status IN ('scheduled', 'live')
     ORDER BY m.scheduled_at ASC LIMIT 20`
  );
  return res.rows;
}

export async function getLiveMatches() {
  const res = await pool.query(
    `SELECT m.*,
      ht.name as home_team_name, ht.short_name as home_short, ht.logo_url as home_logo,
      at.name as away_team_name, at.short_name as away_short, at.logo_url as away_logo
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.status = 'live'
     ORDER BY m.started_at DESC`
  );
  return res.rows;
}

export async function getRecentResults() {
  const res = await pool.query(
    `SELECT m.*,
      ht.name as home_team_name, ht.short_name as home_short,
      at.name as away_team_name, at.short_name as away_short
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.status = 'finished'
     ORDER BY m.finished_at DESC LIMIT 20`
  );
  return res.rows;
}
