import pool from '../db/pool.js';
import { getSetting } from './settingsService.js';

const AMOUNTS = [120, 450, 850, 1200, 2500, 5000];

const WINNER_POOL = [
  { full_name: 'Kwame Mensah', country: 'Ghana', username: 'kwame_m' },
  { full_name: 'Ama Boateng', country: 'Ghana', username: 'ama_bets' },
  { full_name: 'Kofi Asante', country: 'Ghana', username: 'kofi_win' },
  { full_name: 'Abena Osei', country: 'Ghana', username: 'abena_o' },
  { full_name: 'Luca Silva', country: 'Italy', username: 'luca_silva' },
  { full_name: 'Hugo Dupont', country: 'France', username: 'hugo_d' },
  { full_name: 'James García', country: 'Spain', username: 'james_g' },
  { full_name: 'Emil Martin', country: 'Germany', username: 'emil_m' },
  { full_name: 'Oliver Santos', country: 'Portugal', username: 'oliver_s' },
  { full_name: 'Marco Rossi', country: 'Italy', username: 'marco_r' },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBookingId() {
  return `SB${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function listPublicWinners(limit = 12) {
  const result = await pool.query(
    `SELECT id, full_name, country, username, winning_amount, booking_slip_id,
            time_won, profile_picture, is_pinned
     FROM recent_winners
     WHERE is_active = TRUE
     ORDER BY is_pinned DESC, time_won DESC, sort_order ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function listAdminWinners() {
  const result = await pool.query(
    `SELECT * FROM recent_winners ORDER BY is_pinned DESC, time_won DESC`
  );
  return result.rows;
}

export async function createWinner(data) {
  const result = await pool.query(
    `INSERT INTO recent_winners
     (full_name, country, username, winning_amount, booking_slip_id, time_won, profile_picture, is_pinned, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      data.full_name,
      data.country || 'Ghana',
      data.username || null,
      data.winning_amount,
      data.booking_slip_id || generateBookingId(),
      data.time_won || new Date(),
      data.profile_picture || null,
      data.is_pinned || false,
      data.is_active !== false,
      data.sort_order || 0,
    ]
  );
  return result.rows[0];
}

export async function updateWinner(id, data) {
  const result = await pool.query(
    `UPDATE recent_winners SET
      full_name = COALESCE($2, full_name),
      country = COALESCE($3, country),
      username = COALESCE($4, username),
      winning_amount = COALESCE($5, winning_amount),
      booking_slip_id = COALESCE($6, booking_slip_id),
      time_won = COALESCE($7, time_won),
      profile_picture = COALESCE($8, profile_picture),
      is_pinned = COALESCE($9, is_pinned),
      is_active = COALESCE($10, is_active),
      sort_order = COALESCE($11, sort_order),
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      id, data.full_name, data.country, data.username, data.winning_amount,
      data.booking_slip_id, data.time_won, data.profile_picture,
      data.is_pinned, data.is_active, data.sort_order,
    ]
  );
  return result.rows[0];
}

export async function deleteWinner(id) {
  await pool.query('DELETE FROM recent_winners WHERE id = $1', [id]);
}

export async function seedDefaultWinners() {
  const count = await pool.query('SELECT COUNT(*)::int AS c FROM recent_winners');
  if (count.rows[0].c > 0) return;

  const now = Date.now();
  const seeds = [
    { ...WINNER_POOL[0], amount: 450, mins: 0 },
    { ...WINNER_POOL[1], amount: 1200, mins: 12 },
    { ...WINNER_POOL[2], amount: 850, mins: 28 },
    { ...WINNER_POOL[3], amount: 2500, mins: 45 },
    { ...WINNER_POOL[4], amount: 120, mins: 60 },
    { ...WINNER_POOL[5], amount: 5000, mins: 90 },
  ];

  for (const s of seeds) {
    await createWinner({
      full_name: s.full_name,
      country: s.country,
      username: s.username,
      winning_amount: s.amount,
      booking_slip_id: generateBookingId(),
      time_won: new Date(now - s.mins * 60000),
    });
  }
  console.log('✅ Recent winners seeded');
}

export async function rotateAutoWinner() {
  const enabled = await getSetting('winners_auto_rotation', 'true');
  if (enabled !== 'true') return null;

  const person = pick(WINNER_POOL);
  const amount = pick(AMOUNTS);
  const winner = await createWinner({
    full_name: person.full_name,
    country: person.country,
    username: person.username,
    winning_amount: amount,
    booking_slip_id: generateBookingId(),
    time_won: new Date(),
  });

  const trim = await pool.query(
    `SELECT id FROM recent_winners WHERE is_pinned = FALSE ORDER BY time_won ASC LIMIT 50`
  );
  if (trim.rows.length > 20) {
    const toDelete = trim.rows.slice(0, trim.rows.length - 20).map((r) => r.id);
    await pool.query('DELETE FROM recent_winners WHERE id = ANY($1) AND is_pinned = FALSE', [toDelete]);
  }

  return winner;
}

let winnersIo = null;
let rotationTimer = null;

export function setWinnersIo(socketIo) {
  winnersIo = socketIo;
}

export function initWinnerRotation(io) {
  if (rotationTimer) clearInterval(rotationTimer);

  const tick = async () => {
    try {
      const winner = await rotateAutoWinner();
      if (winner && io) {
        io.emit('winners:updated', { winners: await listPublicWinners() });
        io.emit('winner:new', {
          full_name: winner.full_name,
          winning_amount: parseFloat(winner.winning_amount),
          booking_slip_id: winner.booking_slip_id,
        });
      }
    } catch (err) {
      console.error('Winner rotation error:', err.message);
    }
  };

  rotationTimer = setInterval(tick, 2 * 60 * 1000);
}

export function emitWinnersUpdate(io = winnersIo) {
  if (!io) return;
  listPublicWinners().then((winners) => io.emit('winners:updated', { winners }));
}
