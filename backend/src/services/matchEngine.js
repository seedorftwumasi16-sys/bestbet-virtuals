import pool from '../db/pool.js';
import { generateMatchOdds } from './oddsService.js';
import { getMatchIntervalSeconds } from './matchIntervalService.js';
import { ensureSeasonFixtures, getNextFixture } from './fixtureService.js';
import { simulateMatchOutcome } from './simulationService.js';
import { updateLeaguePositions } from './leagueService.js';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function createScheduledMatch(homeTeamId, awayTeamId, scheduledAt, leagueName = null, leagueId = null, fixtureId = null, preset = null) {
  const teams = await pool.query(
    `SELECT id, strength, attack_rating, midfield_rating, defense_rating, league FROM teams WHERE id IN ($1, $2)`,
    [homeTeamId, awayTeamId]
  );
  const homeTeam = teams.rows.find((t) => t.id === homeTeamId);
  const awayTeam = teams.rows.find((t) => t.id === awayTeamId);
  const homeStr = homeTeam?.strength || 50;
  const awayStr = awayTeam?.strength || 50;
  const league = leagueName || homeTeam?.league || awayTeam?.league;

  let resolvedLeagueId = leagueId;
  if (!resolvedLeagueId && league) {
    const lg = await pool.query('SELECT id FROM leagues WHERE name = $1', [league]);
    resolvedLeagueId = lg.rows[0]?.id || null;
  }

  const presetEvents = preset?.events ? JSON.stringify(preset.events) : '[]';
  const presetHome = preset?.homeScore ?? null;
  const presetAway = preset?.awayScore ?? null;
  const isManual = Boolean(preset?.events?.length);

  const res = await pool.query(
    `INSERT INTO matches (home_team_id, away_team_id, scheduled_at, status, league_id,
      preset_home_score, preset_away_score, preset_events, is_manual)
     VALUES ($1, $2, $3, 'scheduled', $4, $5, $6, $7, $8) RETURNING *`,
    [homeTeamId, awayTeamId, scheduledAt, resolvedLeagueId, presetHome, presetAway, presetEvents, isManual]
  );
  const match = res.rows[0];
  const odds = generateMatchOdds(homeStr, awayStr);
  for (const o of odds) {
    await pool.query(
      `INSERT INTO match_odds (match_id, market, selection, odds) VALUES ($1, $2, $3, $4)`,
      [match.id, o.market, o.selection, o.odds]
    );
  }

  if (fixtureId) {
    await pool.query('UPDATE season_fixtures SET match_id = $2 WHERE id = $1', [fixtureId, match.id]);
  }

  return match;
}

export async function generateNextMatches() {
  await ensureSeasonFixtures();

  const leaguesRes = await pool.query(
    `SELECT DISTINCT t.league, l.id AS league_id
     FROM teams t
     LEFT JOIN leagues l ON l.name = t.league
     WHERE t.is_active = TRUE AND t.league IS NOT NULL
     ORDER BY t.league`
  );
  if (!leaguesRes.rows.length) return [];

  const intervalSec = await getMatchIntervalSeconds();
  const baseTime = Date.now() + intervalSec * 1000;
  const matches = [];

  const liveCount = await pool.query(`SELECT COUNT(*)::int AS c FROM matches WHERE status IN ('scheduled','live')`);
  if (liveCount.rows[0].c >= leaguesRes.rows.length) return [];

  for (let i = 0; i < leaguesRes.rows.length; i++) {
    const { league: leagueName, league_id: leagueId } = leaguesRes.rows[i];

    const existing = await pool.query(
      `SELECT m.id FROM matches m
       JOIN teams ht ON m.home_team_id = ht.id
       WHERE ht.league = $1 AND m.status IN ('scheduled', 'live') LIMIT 1`,
      [leagueName]
    );
    if (existing.rows.length) continue;

    let homeId;
    let awayId;
    let fixtureId = null;

    if (leagueId) {
      const fixture = await getNextFixture(leagueId);
      if (fixture) {
        homeId = fixture.home_team_id;
        awayId = fixture.away_team_id;
        fixtureId = fixture.id;
      }
    }

    if (!homeId || !awayId) {
      const teamsRes = await pool.query(
        'SELECT id FROM teams WHERE is_active = TRUE AND league = $1 ORDER BY RANDOM()',
        [leagueName]
      );
      const teams = teamsRes.rows;
      if (teams.length < 2) continue;
      let home = teams[randomInt(0, teams.length - 1)];
      let away = teams[randomInt(0, teams.length - 1)];
      while (away.id === home.id) away = teams[randomInt(0, teams.length - 1)];
      homeId = home.id;
      awayId = away.id;
    }

    const scheduledAt = new Date(baseTime + i * 8000);
    const match = await createScheduledMatch(homeId, awayId, scheduledAt, leagueName, leagueId, fixtureId);
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
  const { forceFinishMatch } = await import('./schedulerService.js');
  if (manualData) {
    return forceFinishMatch(matchId, manualData);
  }
  const matchRes = await pool.query('SELECT home_team_id, away_team_id FROM matches WHERE id = $1', [matchId]);
  if (!matchRes.rows[0]) throw new Error('Match not found');
  const { home_team_id, away_team_id } = matchRes.rows[0];
  const outcome = await simulateMatchOutcome(home_team_id, away_team_id);
  return forceFinishMatch(matchId, {
    home_score: outcome.homeGoals,
    away_score: outcome.awayGoals,
    goal_times: outcome.events,
  });
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
      ht.star_rating as home_star_rating, ht.attack_rating as home_attack, ht.defense_rating as home_defense,
      at.name as away_team_name, at.short_name as away_short, at.logo_url as away_logo,
      at.star_rating as away_star_rating, at.attack_rating as away_attack, at.defense_rating as away_defense
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
      ht.star_rating as home_star_rating, ht.attack_rating as home_attack, ht.defense_rating as home_defense,
      at.name as away_team_name, at.short_name as away_short, at.logo_url as away_logo,
      at.star_rating as away_star_rating, at.attack_rating as away_attack, at.defense_rating as away_defense
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
      ht.star_rating as home_star_rating, ht.attack_rating as home_attack, ht.defense_rating as home_defense,
      at.name as away_team_name, at.short_name as away_short, at.logo_url as away_logo,
      at.star_rating as away_star_rating, at.attack_rating as away_attack, at.defense_rating as away_defense
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
      ht.name as home_team_name, ht.short_name as home_short, ht.logo_url as home_logo,
      ht.star_rating as home_star_rating,
      at.name as away_team_name, at.short_name as away_short, at.logo_url as away_logo,
      at.star_rating as away_star_rating,
      CASE WHEN m.home_score > m.away_score THEN ht.name
           WHEN m.away_score > m.home_score THEN at.name
           ELSE 'Draw' END AS winning_team,
      (SELECT me.player_name FROM match_events me
       WHERE me.match_id = m.id AND me.event_type = 'goal' AND me.player_name IS NOT NULL
       ORDER BY me.minute ASC LIMIT 1) AS top_scorer
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.status = 'finished'
     ORDER BY m.finished_at DESC LIMIT 20`
  );
  return res.rows;
}
