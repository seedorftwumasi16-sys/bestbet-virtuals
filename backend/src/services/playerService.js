import pool from '../db/pool.js';
import { generateSquad } from '../data/europeanPlayers.js';
import { MIN_SQUAD_SIZE } from '../data/europeanFootball.js';

export async function seedPlayersForTeam(teamId, teamShort, teamStars) {
  const countRes = await pool.query(
    'SELECT COUNT(*)::int AS c FROM players WHERE team_id = $1',
    [teamId]
  );
  if (countRes.rows[0].c >= MIN_SQUAD_SIZE) return countRes.rows[0].c;

  await pool.query('DELETE FROM players WHERE team_id = $1', [teamId]);
  const squad = generateSquad(teamShort, teamStars);

  for (const p of squad) {
    await pool.query(
      `INSERT INTO players (team_id, name, position, shirt_number, star_rating, is_striker, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [teamId, p.name, p.position, p.shirtNumber, p.starRating, p.isStriker]
    );
  }

  return squad.length;
}

export async function incrementPlayerGoals(playerId) {
  if (!playerId) return;
  await pool.query(
    'UPDATE players SET goals_season = goals_season + 1, updated_at = NOW() WHERE id = $1',
    [playerId]
  );
}

export async function getPlayersByTeam(teamId) {
  const res = await pool.query(
    'SELECT * FROM players WHERE team_id = $1 ORDER BY position, shirt_number',
    [teamId]
  );
  return res.rows;
}
