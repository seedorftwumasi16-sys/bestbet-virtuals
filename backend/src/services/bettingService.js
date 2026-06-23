import pool from '../db/pool.js';
import { evaluateSelection } from './oddsService.js';
import { creditAccount } from './walletService.js';
import { createNotification } from './notificationService.js';
import { getSetting } from './settingsService.js';

async function generateUniqueBookingCode(client) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 15; attempt++) {
    let code = 'SB';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const exists = await client.query(
      'SELECT 1 FROM bets WHERE booking_code = $1 UNION SELECT 1 FROM saved_betslips WHERE code = $1',
      [code]
    );
    if (!exists.rows.length) return code;
  }
  throw new Error('Could not generate unique booking code');
}

export function computeBetDisplayStatus(bet) {
  if (bet.status === 'voided') return 'voided';
  if (bet.status === 'won') return 'won';
  if (bet.status === 'lost') return 'lost';
  if (bet.status === 'pending' && bet.has_live_match) return 'live';
  if (bet.status === 'pending') return 'pending';
  return bet.status;
}

function matchesStatusFilter(bet, filter) {
  const display = computeBetDisplayStatus(bet);
  switch (filter) {
    case 'open':
      return display === 'pending';
    case 'live':
      return display === 'live';
    case 'won':
      return display === 'won';
    case 'lost':
      return display === 'lost';
    case 'settled':
      return display === 'won' || display === 'lost';
    default:
      return true;
  }
}

function mapBetRow(row) {
  const selections = typeof row.selections === 'string' ? JSON.parse(row.selections) : row.selections || [];
  const bet = {
    ...row,
    selections,
    has_live_match: Boolean(row.has_live_match),
    stake: parseFloat(row.stake),
    potential_win: parseFloat(row.potential_win),
    total_odds: parseFloat(row.total_odds),
    actual_win: row.status === 'won' ? parseFloat(row.potential_win) : 0,
    display_status: computeBetDisplayStatus(row),
    is_settled: Boolean(row.settled_at),
  };
  bet.display_status = computeBetDisplayStatus(bet);
  return bet;
}

const BET_ENRICHED_QUERY = `
  SELECT b.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', bs.id,
          'match_id', bs.match_id,
          'market', bs.market,
          'selection', bs.selection,
          'odds', bs.odds,
          'status', bs.status,
          'home_team', bs.home_team,
          'away_team', bs.away_team,
          'match_status', m.status,
          'home_score', m.home_score,
          'away_score', m.away_score,
          'live_minute', m.live_minute
        ) ORDER BY bs.created_at
      ) FILTER (WHERE bs.id IS NOT NULL),
      '[]'
    ) AS selections,
    BOOL_OR(m.status = 'live') AS has_live_match,
    COUNT(bs.id)::int AS selection_count
  FROM bets b
  LEFT JOIN bet_selections bs ON bs.bet_id = b.id
  LEFT JOIN matches m ON m.id = bs.match_id
`;

export async function placeBet(userId, selections, stake) {
  const minBet = parseFloat(await pool.query('SELECT value FROM system_settings WHERE key = $1', ['min_bet']).then((r) => r.rows[0]?.value || '1'));
  const maxBet = parseFloat(await pool.query('SELECT value FROM system_settings WHERE key = $1', ['max_bet']).then((r) => r.rows[0]?.value || '50000'));

  if (stake < minBet || stake > maxBet) {
    throw new Error(`Stake must be between GHS ${minBet} and GHS ${maxBet}`);
  }

  if (!selections?.length) throw new Error('No selections provided');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalOdds = 1;
    const validatedSelections = [];

    for (const sel of selections) {
      const matchRes = await client.query(
        `SELECT m.*, ht.name as home_name, at.name as away_name
         FROM matches m JOIN teams ht ON m.home_team_id = ht.id JOIN teams at ON m.away_team_id = at.id
         WHERE m.id = $1`,
        [sel.matchId]
      );
      const match = matchRes.rows[0];
      if (!match || !['scheduled', 'live'].includes(match.status)) {
        throw new Error(`Match ${sel.homeTeam || sel.matchId} is not available for betting`);
      }

      const closeSec = parseInt(await getSetting('betting_close_seconds', '10'), 10);
      if (match.status === 'scheduled') {
        const msToKickoff = new Date(match.scheduled_at).getTime() - Date.now();
        if (msToKickoff < closeSec * 1000) {
          throw new Error('Betting closed — kickoff in less than 10 seconds');
        }
      }

      const oddsRes = await client.query(
        'SELECT odds FROM match_odds WHERE match_id = $1 AND market = $2 AND selection = $3 AND is_active = TRUE',
        [sel.matchId, sel.market, sel.selection]
      );
      if (!oddsRes.rows[0]) throw new Error(`Invalid selection: ${sel.market}/${sel.selection}`);

      const odds = parseFloat(oddsRes.rows[0].odds);
      totalOdds *= odds;
      validatedSelections.push({
        matchId: sel.matchId,
        market: sel.market,
        selection: sel.selection,
        odds,
        homeTeam: match.home_name,
        awayTeam: match.away_name,
      });
    }

    totalOdds = Math.round(totalOdds * 100) / 100;
    const potentialWin = Math.round(stake * totalOdds * 100) / 100;
    const bookingCode = await generateUniqueBookingCode(client);

    const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const balance = parseFloat(userRes.rows[0].balance);
    if (balance < stake) throw new Error('Insufficient balance');

    const balanceAfter = balance - stake;
    await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [balanceAfter, userId]);

    const betRes = await client.query(
      `INSERT INTO bets (user_id, booking_code, stake, potential_win, total_odds, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [userId, bookingCode, stake, potentialWin, totalOdds]
    );
    const bet = betRes.rows[0];

    for (const sel of validatedSelections) {
      await client.query(
        `INSERT INTO bet_selections (bet_id, match_id, market, selection, odds, home_team, away_team)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [bet.id, sel.matchId, sel.market, sel.selection, sel.odds, sel.homeTeam, sel.awayTeam]
      );
    }

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference, description, status)
       VALUES ($1, 'bet', $2, $3, $4, $5, 'Bet placed', 'completed')`,
      [userId, -stake, balance, balanceAfter, bookingCode]
    );

    await client.query('COMMIT');

    const enriched = await getBetDetails(bet.id);
    return enriched;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function settleBetsForMatch(matchId) {
  const matchRes = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
  const match = matchRes.rows[0];
  if (!match || match.status !== 'finished') return;

  const selectionsRes = await pool.query(
    `SELECT bs.*, b.user_id, b.id as bet_id, b.stake, b.total_odds, b.potential_win, b.status as bet_status
     FROM bet_selections bs JOIN bets b ON bs.bet_id = b.id
     WHERE bs.match_id = $1 AND bs.status = 'pending'`,
    [matchId]
  );

  const betMap = {};
  for (const sel of selectionsRes.rows) {
    const won = evaluateSelection(sel.market, sel.selection, match);
    await pool.query('UPDATE bet_selections SET status = $1 WHERE id = $2', [won ? 'won' : 'lost', sel.id]);

    if (!betMap[sel.bet_id]) {
      betMap[sel.bet_id] = { userId: sel.user_id, stake: sel.stake, potentialWin: sel.potential_win, allWon: true, anyLost: false };
    }
    if (!won) betMap[sel.bet_id].anyLost = true;
  }

  for (const [betId, data] of Object.entries(betMap)) {
    const allSelections = await pool.query('SELECT status FROM bet_selections WHERE bet_id = $1', [betId]);
    const pending = allSelections.rows.filter((s) => s.status === 'pending').length;
    if (pending > 0) continue;

    const anyLost = allSelections.rows.some((s) => s.status === 'lost');
    if (anyLost) {
      await pool.query('UPDATE bets SET status = $1, settled_at = NOW() WHERE id = $2', ['lost', betId]);
      await createNotification(data.userId, 'bet', 'Bet Settled', `Your bet was settled as LOST. Final score: ${match.home_score}-${match.away_score}.`);
    } else {
      await pool.query('UPDATE bets SET status = $1, settled_at = NOW() WHERE id = $2', ['won', betId]);
      await creditAccount(data.userId, data.potentialWin, 'win', betId, `Bet won - GHS ${data.potentialWin}`);
      await createNotification(
        data.userId,
        'win',
        'You Won!',
        `Your bet won GHS ${parseFloat(data.potentialWin).toFixed(2)}! Booking code: credited to wallet.`
      );
    }
  }
}

export async function manuallySettleBet(betId, outcome) {
  const betRes = await pool.query('SELECT * FROM bets WHERE id = $1', [betId]);
  const bet = betRes.rows[0];
  if (!bet) throw new Error('Bet not found');
  if (!['pending', 'partial'].includes(bet.status)) throw new Error('Bet already settled');

  if (outcome === 'won') {
    await pool.query('UPDATE bets SET status = $1, settled_at = NOW() WHERE id = $2', ['won', betId]);
    await pool.query('UPDATE bet_selections SET status = $1 WHERE bet_id = $2', ['won', betId]);
    await creditAccount(bet.user_id, parseFloat(bet.potential_win), 'win', betId, 'Admin manual settlement - won');
    await createNotification(bet.user_id, 'win', 'Bet Won', `Your bet was settled as WON. GHS ${bet.potential_win} credited.`);
  } else {
    await pool.query('UPDATE bets SET status = $1, settled_at = NOW() WHERE id = $2', ['lost', betId]);
    await pool.query('UPDATE bet_selections SET status = $1 WHERE bet_id = $2 AND status = $3', ['lost', betId, 'pending']);
    await createNotification(bet.user_id, 'bet', 'Bet Lost', 'Your bet was settled as LOST by admin.');
  }
  return getBetDetails(betId);
}

export async function voidBet(betId) {
  const betRes = await pool.query('SELECT * FROM bets WHERE id = $1', [betId]);
  const bet = betRes.rows[0];
  if (!bet) throw new Error('Bet not found');

  await pool.query('UPDATE bets SET status = $1, settled_at = NOW() WHERE id = $2', ['voided', betId]);
  await pool.query('UPDATE bet_selections SET status = $1 WHERE bet_id = $2', ['voided', betId]);

  if (bet.status === 'pending' || bet.status === 'lost') {
    await creditAccount(bet.user_id, parseFloat(bet.stake), 'refund', betId, 'Bet voided - stake refunded');
    await createNotification(bet.user_id, 'bet', 'Bet Voided', `Your bet ${bet.booking_code} was voided. Stake refunded.`);
  }
}

export async function getBetByBookingCode(code) {
  const normalized = code.trim().toUpperCase();
  const betRes = await pool.query('SELECT * FROM bets WHERE UPPER(booking_code) = $1', [normalized]);
  if (!betRes.rows[0]) return null;
  return getBetDetails(betRes.rows[0].id);
}

export async function getUserBets(userId, options = {}) {
  const limit = parseInt(options.limit || '100', 10);
  const status = options.status || 'all';

  const res = await pool.query(
    `${BET_ENRICHED_QUERY}
     WHERE b.user_id = $1
     GROUP BY b.id
     ORDER BY b.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  let rows = res.rows.map(mapBetRow);
  if (status !== 'all') {
    rows = rows.filter((b) => matchesStatusFilter(b, status));
  }
  return rows;
}

export async function getUserBetsSummary(userId) {
  const all = await getUserBets(userId, { limit: 50 });
  return {
    recent: all.slice(0, 5),
    active: all.filter((b) => ['pending', 'live'].includes(b.display_status)).slice(0, 5),
    lastWon: all.filter((b) => b.display_status === 'won').slice(0, 5),
  };
}

export async function getBetDetails(betId) {
  const res = await pool.query(
    `${BET_ENRICHED_QUERY}
     WHERE b.id = $1
     GROUP BY b.id`,
    [betId]
  );
  if (!res.rows[0]) return { bet: null, selections: [] };
  const bet = mapBetRow(res.rows[0]);
  return { bet, selections: bet.selections };
}

export async function getAllBetsAdmin({ bookingCode, limit = 200 } = {}) {
  const params = [];
  let filter = '';
  if (bookingCode?.trim()) {
    params.push(`%${bookingCode.trim().toUpperCase()}%`);
    filter = ` AND UPPER(b.booking_code) LIKE $${params.length}`;
  }
  params.push(limit);
  const res = await pool.query(
    `SELECT b.*, u.email, u.first_name, u.last_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', bs.id,
            'match_id', bs.match_id,
            'market', bs.market,
            'selection', bs.selection,
            'odds', bs.odds,
            'status', bs.status,
            'home_team', bs.home_team,
            'away_team', bs.away_team,
            'match_status', m.status,
            'home_score', m.home_score,
            'away_score', m.away_score,
            'live_minute', m.live_minute
          ) ORDER BY bs.created_at
        ) FILTER (WHERE bs.id IS NOT NULL),
        '[]'
      ) AS selections,
      BOOL_OR(m.status = 'live') AS has_live_match,
      COUNT(bs.id)::int AS selection_count
     FROM bets b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN bet_selections bs ON bs.bet_id = b.id
     LEFT JOIN matches m ON m.id = bs.match_id
     WHERE 1=1 ${filter}
     GROUP BY b.id, u.email, u.first_name, u.last_name
     ORDER BY b.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return res.rows.map(mapBetRow);
}
