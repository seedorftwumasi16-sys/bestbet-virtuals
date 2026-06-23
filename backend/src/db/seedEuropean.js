import { EUROPEAN_LEAGUES, EUROPEAN_TEAMS } from '../data/europeanFootball.js';
import { generateNextMatches } from '../services/matchEngine.js';

/**
 * Seed European leagues, teams, and league tables (replaces fictional Ghana teams in dev).
 */
export async function seedEuropeanFootball(pool, { reset = false } = {}) {
  if (reset) {
    await pool.query('DELETE FROM bet_selections').catch(() => {});
    await pool.query('DELETE FROM bets').catch(() => {});
    await pool.query('DELETE FROM match_events').catch(() => {});
    await pool.query('DELETE FROM match_odds').catch(() => {});
    await pool.query('DELETE FROM team_form').catch(() => {});
    await pool.query('DELETE FROM matches').catch(() => {});
    await pool.query('DELETE FROM league_table').catch(() => {});
    await pool.query('DELETE FROM teams').catch(() => {});
    await pool.query('DELETE FROM leagues').catch(() => {});
  }

  const leagueIds = {};
  for (const lg of EUROPEAN_LEAGUES) {
    const existing = await pool.query('SELECT id FROM leagues WHERE code = $1', [lg.code]);
    if (existing.rows[0]) {
      leagueIds[lg.name] = existing.rows[0].id;
      await pool.query(
        'UPDATE leagues SET name = $1, description = $2, is_active = true, updated_at = NOW() WHERE code = $3',
        [lg.name, `${lg.country} Virtual League`, lg.code]
      );
    } else {
      const res = await pool.query(
        'INSERT INTO leagues (name, code, description, is_active) VALUES ($1, $2, $3, true) RETURNING id',
        [lg.name, lg.code, `${lg.country} Virtual League`]
      );
      leagueIds[lg.name] = res.rows[0].id;
    }
  }

  let position = 1;
  const teamsByLeague = {};

  for (const team of EUROPEAN_TEAMS) {
    const existing = await pool.query('SELECT id FROM teams WHERE short_name = $1', [team.short]);
    let teamId;
    if (existing.rows[0]) {
      teamId = existing.rows[0].id;
      await pool.query(
        `UPDATE teams SET name = $1, league = $2, strength = $3, color_primary = $4, color_secondary = $5,
         is_active = true, updated_at = NOW() WHERE id = $6`,
        [team.name, team.league, team.strength, team.colorPrimary, team.colorSecondary, teamId]
      );
    } else {
      const res = await pool.query(
        `INSERT INTO teams (name, short_name, league, strength, color_primary, color_secondary, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
        [team.name, team.short, team.league, team.strength, team.colorPrimary, team.colorSecondary]
      );
      teamId = res.rows[0].id;
    }

    if (!teamsByLeague[team.league]) teamsByLeague[team.league] = [];
    teamsByLeague[team.league].push(teamId);

    const lt = await pool.query('SELECT id FROM league_table WHERE team_id = $1', [teamId]);
    if (!lt.rows[0]) {
      await pool.query(
        'INSERT INTO league_table (team_id, position) VALUES ($1, $2)',
        [teamId, position++]
      );
    }
  }

  const scheduled = await pool.query(
    `SELECT COUNT(*) as c FROM matches WHERE status IN ('scheduled', 'live')`
  );
  if (parseInt(scheduled.rows[0].c, 10) === 0) {
    await generateNextMatches();
  }

  console.log(`✅ European football seeded: ${EUROPEAN_TEAMS.length} teams, ${EUROPEAN_LEAGUES.length} leagues`);
  return { leagueIds, teamsByLeague };
}
