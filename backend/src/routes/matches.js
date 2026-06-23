import { Router } from 'express';
import {
  getUpcomingMatches,
  getLiveMatches,
  getRecentResults,
  getMatchWithDetails,
} from '../services/matchEngine.js';
import pool from '../db/pool.js';
import { EUROPEAN_LEAGUES } from '../data/europeanFootball.js';
import { getMatchIntervalSeconds, getBettingCloseSeconds } from '../services/matchIntervalService.js';

const router = Router();

router.get('/upcoming', async (req, res) => {
  try {
    const matches = await getUpcomingMatches();
    const withOdds = await Promise.all(
      matches.map(async (m) => {
        const odds = await pool.query('SELECT market, selection, odds FROM match_odds WHERE match_id = $1 AND is_active = TRUE', [m.id]);
        return { ...m, odds: odds.rows };
      })
    );
    res.json(withOdds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/live', async (req, res) => {
  try {
    res.json(await getLiveMatches());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    res.json(await getRecentResults());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leagues', async (_req, res) => {
  try {
    const counts = await pool.query(
      `SELECT league, COUNT(*)::int AS team_count FROM teams WHERE is_active = TRUE GROUP BY league ORDER BY league`
    );
    const merged = EUROPEAN_LEAGUES.map((lg) => ({
      ...lg,
      team_count: counts.rows.find((r) => r.league === lg.name)?.team_count || 0,
    }));
    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/league-stats', async (req, res) => {
  try {
    const leagueFilter = req.query.league;
    const matchWhere = leagueFilter
      ? `WHERE m.id IN (SELECT m2.id FROM matches m2 JOIN teams ht2 ON m2.home_team_id = ht2.id WHERE ht2.league = $1)`
      : '';
    const matchParams = leagueFilter ? [leagueFilter] : [];

    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'finished')::int AS total_played,
         COUNT(*) FILTER (WHERE status = 'live')::int AS live_count,
         COUNT(*) FILTER (WHERE status = 'scheduled')::int AS upcoming_count,
         COALESCE(SUM(home_score + away_score) FILTER (WHERE status = 'finished'), 0)::int AS total_goals,
         COALESCE(SUM(yellow_cards_home + yellow_cards_away) FILTER (WHERE status = 'finished'), 0)::int AS yellow_cards,
         COALESCE(SUM(red_cards_home + red_cards_away) FILTER (WHERE status = 'finished'), 0)::int AS red_cards
       FROM matches m ${matchWhere}`,
      matchParams
    );
    const leaderQuery = leagueFilter
      ? `SELECT lt.*, t.name, t.short_name, t.logo_url, t.league
         FROM league_table lt JOIN teams t ON lt.team_id = t.id
         WHERE t.league = $1 ORDER BY lt.position ASC LIMIT 1`
      : `SELECT lt.*, t.name, t.short_name, t.logo_url, t.league
         FROM league_table lt JOIN teams t ON lt.team_id = t.id
         ORDER BY lt.position ASC LIMIT 1`;
    const leader = await pool.query(leaderQuery, leagueFilter ? [leagueFilter] : []);

    const season = await pool.query(`SELECT value FROM system_settings WHERE key = 'current_season'`);
    const prizePool = await pool.query(`SELECT value FROM system_settings WHERE key = 'prize_pool_base'`);
    const intervalSec = await getMatchIntervalSeconds();
    const bettingCloseSec = await getBettingCloseSeconds();

    const nextParams = leagueFilter ? [leagueFilter] : [];
    const nextMatch = await pool.query(
      `SELECT m.id, m.scheduled_at,
              ht.name AS home_name, ht.short_name AS home_short, ht.logo_url AS home_logo, ht.league AS league_name,
              at.name AS away_name, at.short_name AS away_short, at.logo_url AS away_logo
       FROM matches m
       JOIN teams ht ON m.home_team_id = ht.id
       JOIN teams at ON m.away_team_id = at.id
       WHERE m.status = 'scheduled' ${leagueFilter ? 'AND ht.league = $1' : ''}
       ORDER BY m.scheduled_at ASC LIMIT 1`,
      nextParams
    );

    const row = stats.rows[0] || {};
    const totalPlayed = row.total_played ?? 0;
    const totalGoals = row.total_goals ?? 0;
    const avgGoals = totalPlayed > 0 ? (totalGoals / totalPlayed).toFixed(2) : '0.00';
    const basePool = parseFloat(prizePool.rows[0]?.value || '10000');
    const dynamicPool = basePool + totalPlayed * 125 + (row.live_count ?? 0) * 500;

    res.json({
      total_played: totalPlayed,
      live_count: row.live_count ?? 0,
      upcoming_count: row.upcoming_count ?? 0,
      total_goals: totalGoals,
      avg_goals: avgGoals,
      yellow_cards: row.yellow_cards ?? 0,
      red_cards: row.red_cards ?? 0,
      prize_pool: dynamicPool,
      season: season.rows[0]?.value || String(new Date().getFullYear()),
      match_interval_seconds: intervalSec,
      match_interval_minutes: Math.round(intervalSec / 60) || 1,
      betting_close_seconds: bettingCloseSec,
      leader: leader.rows[0] || null,
      next_match: nextMatch.rows[0] || null,
      active_league: leagueFilter || nextMatch.rows[0]?.league_name || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-scorers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT me.player_name, COUNT(*)::int AS goals,
              t.id AS team_id, t.name AS team_name, t.short_name, t.logo_url
       FROM match_events me
       JOIN teams t ON me.team_id = t.id
       WHERE me.event_type = 'goal' AND me.player_name IS NOT NULL
       GROUP BY me.player_name, t.id, t.name, t.short_name, t.logo_url
       ORDER BY goals DESC, me.player_name ASC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/league-table', async (req, res) => {
  try {
    const { league } = req.query;
    const params = [];
    let filter = '';
    if (league) {
      params.push(league);
      filter = `WHERE t.league = $${params.length}`;
    }
    const res2 = await pool.query(
      `SELECT lt.*, t.name, t.short_name, t.logo_url, t.league, t.id AS team_id,
       (
         SELECT COALESCE(json_agg(f.result ORDER BY f.created_at DESC), '[]'::json)
         FROM (
           SELECT result, created_at FROM team_form
           WHERE team_id = lt.team_id ORDER BY created_at DESC LIMIT 5
         ) f
       ) AS form
       FROM league_table lt JOIN teams t ON lt.team_id = t.id
       ${filter}
       ORDER BY lt.position ASC`,
      params
    );
    res.json(res2.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/team-form/:teamId', async (req, res) => {
  try {
    const res2 = await pool.query(
      `SELECT tf.* FROM team_form tf WHERE tf.team_id = $1 ORDER BY tf.created_at DESC LIMIT 5`,
      [req.params.teamId]
    );
    res.json(res2.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const details = await getMatchWithDetails(req.params.id);
    if (!details.match) return res.status(404).json({ error: 'Match not found' });
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
