import pool from '../db/pool.js';

export async function updateLeaguePositions() {
  const res = await pool.query(
    'SELECT team_id, points, goals_for, goals_against FROM league_table ORDER BY points DESC, goals_for - goals_against DESC'
  );
  for (let i = 0; i < res.rows.length; i++) {
    await pool.query('UPDATE league_table SET position = $1, updated_at = NOW() WHERE team_id = $2', [i + 1, res.rows[i].team_id]);
  }
}
