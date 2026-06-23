import pool from '../db/pool.js';
import { EUROPEAN_LEAGUES } from '../data/europeanFootball.js';

/** Double round-robin home & away fixtures for all teams in a league */
export async function buildSeasonFixtures(leagueId, leagueName, seasonId) {
  const teamsRes = await pool.query(
    'SELECT id FROM teams WHERE is_active = TRUE AND league = $1 ORDER BY short_name',
    [leagueName]
  );
  const teamIds = teamsRes.rows.map((r) => r.id);
  if (teamIds.length < 2) return 0;

  await pool.query(
    'DELETE FROM season_fixtures WHERE league_id = $1 AND is_played = FALSE',
    [leagueId]
  );

  const fixtures = [];
  let order = 0;
  let matchday = 1;

  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const home = round === 0 ? teamIds[i] : teamIds[j];
        const away = round === 0 ? teamIds[j] : teamIds[i];
        fixtures.push({ home, away, matchday: matchday++, order: order++ });
      }
    }
  }

  for (const f of fixtures) {
    await pool.query(
      `INSERT INTO season_fixtures (league_id, season_id, home_team_id, away_team_id, matchday, scheduled_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [leagueId, seasonId, f.home, f.away, f.matchday, f.order]
    );
  }

  return fixtures.length;
}

export async function getNextFixture(leagueId) {
  const res = await pool.query(
    `SELECT * FROM season_fixtures
     WHERE league_id = $1 AND is_played = FALSE
     ORDER BY scheduled_order ASC LIMIT 1`,
    [leagueId]
  );
  return res.rows[0] || null;
}

export async function markFixturePlayed(fixtureId, matchId) {
  await pool.query(
    `UPDATE season_fixtures SET is_played = TRUE, match_id = $2 WHERE id = $1`,
    [fixtureId, matchId]
  );
}

export async function ensureSeasonFixtures() {
  const seasonRes = await pool.query(
    `SELECT value FROM system_settings WHERE key = 'current_season'`
  );
  const seasonName = seasonRes.rows[0]?.value || String(new Date().getFullYear());

  for (const lg of EUROPEAN_LEAGUES) {
    const leagueRes = await pool.query('SELECT id FROM leagues WHERE code = $1', [lg.code]);
    const leagueId = leagueRes.rows[0]?.id;
    if (!leagueId) continue;

    let seasonId;
    const existingSeason = await pool.query(
      'SELECT id FROM seasons WHERE league_id = $1 AND name = $2',
      [leagueId, seasonName]
    );
    if (existingSeason.rows[0]) {
      seasonId = existingSeason.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO seasons (league_id, name, is_active) VALUES ($1, $2, true) RETURNING id`,
        [leagueId, seasonName]
      );
      seasonId = ins.rows[0].id;
    }

    const pending = await pool.query(
      'SELECT COUNT(*)::int AS c FROM season_fixtures WHERE league_id = $1 AND is_played = FALSE',
      [leagueId]
    );
    if (pending.rows[0].c === 0) {
      await buildSeasonFixtures(leagueId, lg.name, seasonId);
    }
  }
}
