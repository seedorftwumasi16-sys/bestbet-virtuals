import pool from '../db/pool.js';
import { evaluateSelection } from './oddsService.js';
import { creditAccount } from './walletService.js';
import { createNotification } from './notificationService.js';
import { getSetting } from './settingsService.js';

function generateBookingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function placeBet(userId, selections, stake) {
  const minBet = parseFloat(await pool.query('SELECT value FROM system_settings WHERE key = $1', ['min_bet']).then(r => r.rows[0]?.value || '1'));
  const maxBet = parseFloat(await pool.query('SELECT value FROM system_settings WHERE key = $1', ['max_bet']).then(r => r.rows[0]?.value || '50000'));

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
      if (!match || match.status !== 'scheduled') {
        throw new Error(`Match ${sel.matchId} is not available for betting`);
      }

      const closeSec = parseInt(await getSetting('betting_close_seconds', '10'), 10);
      const msToKickoff = new Date(match.scheduled_at).getTime() - Date.now();
      if (msToKickoff < closeSec * 1000) {
        throw new Error('Betting closed — kickoff in less than 10 seconds');
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
    const bookingCode = generateBookingCode();

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
    return { bet, selections: validatedSelections };
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
      betMap[sel.bet_id] = { userId: sel.user_id, stake: sel.stake, potentialWin: sel.potential_win, allWon: true, anyLost: false, pending: 0 };
    }
    if (!won) betMap[sel.bet_id].anyLost = true;
    if (won) betMap[sel.bet_id].allWon = betMap[sel.bet_id].allWon && won;
  }

  for (const [betId, data] of Object.entries(betMap)) {
    const allSelections = await pool.query('SELECT status FROM bet_selections WHERE bet_id = $1', [betId]);
    const pending = allSelections.rows.filter(s => s.status === 'pending').length;
    if (pending > 0) continue;

    const anyLost = allSelections.rows.some(s => s.status === 'lost');
    if (anyLost) {
      await pool.query('UPDATE bets SET status = $1, settled_at = NOW() WHERE id = $2', ['lost', betId]);
    } else {
      await pool.query('UPDATE bets SET status = $1, settled_at = NOW() WHERE id = $2', ['won', betId]);
      await creditAccount(data.userId, data.potentialWin, 'win', betId, `Bet won - GHS ${data.potentialWin}`);
      await createNotification(data.userId, 'win', 'You Won!', `Your bet won GHS ${data.potentialWin.toFixed(2)}!`);
    }
  }
}

export async function voidBet(betId) {
  const betRes = await pool.query('SELECT * FROM bets WHERE id = $1', [betId]);
  const bet = betRes.rows[0];
  if (!bet) throw new Error('Bet not found');

  await pool.query('UPDATE bets SET status = $1, settled_at = NOW() WHERE id = $2', ['voided', betId]);
  await pool.query('UPDATE bet_selections SET status = $1 WHERE bet_id = $2', ['voided', betId]);

  if (bet.status === 'pending' || bet.status === 'lost') {
    await creditAccount(bet.user_id, parseFloat(bet.stake), 'refund', betId, 'Bet voided - stake refunded');
  }
}

export async function getBetByBookingCode(code) {
  const betRes = await pool.query('SELECT * FROM bets WHERE booking_code = $1', [code]);
  if (!betRes.rows[0]) return null;
  const selections = await pool.query(
    `SELECT bs.*, m.status as match_status, m.home_score, m.away_score
     FROM bet_selections bs JOIN matches m ON bs.match_id = m.id
     WHERE bs.bet_id = $1`,
    [betRes.rows[0].id]
  );
  return { bet: betRes.rows[0], selections: selections.rows };
}

export async function getUserBets(userId, limit = 50) {
  const res = await pool.query(
    `SELECT b.*, COUNT(bs.id) as selection_count
     FROM bets b LEFT JOIN bet_selections bs ON b.id = bs.bet_id
     WHERE b.user_id = $1 GROUP BY b.id ORDER BY b.created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function getBetDetails(betId) {
  const betRes = await pool.query('SELECT * FROM bets WHERE id = $1', [betId]);
  const selections = await pool.query('SELECT * FROM bet_selections WHERE bet_id = $1', [betId]);
  return { bet: betRes.rows[0], selections: selections.rows };
}
