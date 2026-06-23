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
    'SELECT * FROM players WHERE team_id = $1 AND is_active = TRUE ORDER BY position, shirt_number',
    [teamId]
  );
  return res.rows;
}

/** Ensure every team has a squad (startup / admin seed) */
export async function ensureAllTeamSquads() {
  const teams = await pool.query('SELECT id, short_name, star_rating FROM teams ORDER BY name');
  let seeded = 0;
  for (const team of teams.rows) {
    const countRes = await pool.query(
      'SELECT COUNT(*)::int AS c FROM players WHERE team_id = $1 AND is_active = TRUE',
      [team.id]
    );
    if (countRes.rows[0].c === 0) {
      await seedPlayersForTeam(team.id, team.short_name, team.star_rating || 3);
      seeded++;
    }
  }
  if (seeded > 0) console.log(`✅ Auto-seeded squads for ${seeded} teams`);
  return seeded;
}

/** Ensure team has a full European squad; auto-generate if empty */
export async function ensureTeamSquad(teamId) {
  const countRes = await pool.query(
    'SELECT COUNT(*)::int AS c FROM players WHERE team_id = $1 AND is_active = TRUE',
    [teamId]
  );
  if (countRes.rows[0].c > 0) {
    return getPlayersByTeam(teamId);
  }

  const teamRes = await pool.query(
    'SELECT id, short_name, star_rating FROM teams WHERE id = $1',
    [teamId]
  );
  const team = teamRes.rows[0];
  if (!team) return [];

  console.log(`[players] Auto-generating squad for team ${teamId} (${team.short_name})`);
  await seedPlayersForTeam(teamId, team.short_name, team.star_rating || 3);
  return getPlayersByTeam(teamId);
}
