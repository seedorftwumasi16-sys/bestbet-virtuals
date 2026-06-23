import pool from '../db/pool.js';

export async function updateLeaguePositions(leagueName = null) {
  if (leagueName) {
    await rankLeague(leagueName);
    return;
  }

  const leagues = await pool.query(
    'SELECT DISTINCT league FROM teams WHERE league IS NOT NULL AND is_active = TRUE'
  );
  for (const row of leagues.rows) {
    await rankLeague(row.league);
  }
}

async function rankLeague(leagueName) {
  const res = await pool.query(
    `SELECT lt.team_id, lt.points, lt.goals_for, lt.goals_against
     FROM league_table lt
     JOIN teams t ON lt.team_id = t.id
     WHERE t.league = $1
     ORDER BY lt.points DESC, (lt.goals_for - lt.goals_against) DESC, lt.goals_for DESC`,
    [leagueName]
  );
  for (let i = 0; i < res.rows.length; i++) {
    await pool.query('UPDATE league_table SET position = $1, updated_at = NOW() WHERE team_id = $2', [i + 1, res.rows[i].team_id]);
  }
}
