/**
 * Production smoke tests for SkyBet API
 */
const API = 'https://bestbet-api-production-2f20.up.railway.app/api';

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`✅ ${name}`);
}

function fail(name, err) {
  failed++;
  console.error(`❌ ${name}:`, err);
}

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function run() {
  console.log('🧪 SkyBet Production API Tests\n');

  try {
    const { res, data } = await req('/health');
    if (res.ok && data.status === 'ok') ok('Health check');
    else fail('Health check', data);
  } catch (e) { fail('Health check', e.message); }

  let adminToken;
  try {
    const { res, data } = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@bestbet.com', password: 'BestBetAdmin2024!' }),
    });
    if (res.ok && data.token) {
      adminToken = data.token;
      ok('Admin login');
    } else fail('Admin login', data);
  } catch (e) { fail('Admin login', e.message); }

  let demoToken;
  try {
    const { res, data } = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@bestbet.com', password: 'BestBetDemo2024!' }),
    });
    if (res.ok && data.token) {
      demoToken = data.token;
      ok('Demo user login');
    } else fail('Demo user login', data);
  } catch (e) { fail('Demo user login', e.message); }

  try {
    const { res, data } = await req('/matches/upcoming');
    if (res.ok && Array.isArray(data)) {
      ok(`Upcoming matches (${data.length} fixtures)`);
    } else fail('Upcoming matches', data);
  } catch (e) { fail('Upcoming matches', e.message); }

  try {
    const { res, data } = await req('/matches/league-table');
    if (res.ok && Array.isArray(data)) {
      ok(`League table (${data.length} teams)`);
    } else fail('League table', data);
  } catch (e) { fail('League table', e.message); }

  try {
    const { res, data } = await req('/matches/live');
    if (res.ok && Array.isArray(data)) {
      ok(`Live matches (${data.length} live)`);
    } else fail('Live matches', data);
  } catch (e) { fail('Live matches', e.message); }

  if (demoToken) {
    try {
      const { res, data } = await req('/wallet/balance', {
        headers: { Authorization: `Bearer ${demoToken}` },
      });
      if (res.ok && data.balance !== undefined) ok(`Demo wallet balance: GHS ${data.balance}`);
      else fail('Wallet balance', data);
    } catch (e) { fail('Wallet balance', e.message); }
  }

  if (demoToken) {
    try {
      const { res, data } = await req('/wallet/deposit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${demoToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50, paymentMethod: 'mtn_momo', phoneNumber: '0244123456' }),
      });
      if (res.ok) ok('Deposit request');
      else fail('Deposit request', data);
    } catch (e) { fail('Deposit request', e.message); }
  }

  if (demoToken) {
    try {
      const { res, data } = await req('/wallet/withdraw', {
        method: 'POST',
        headers: { Authorization: `Bearer ${demoToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10, paymentMethod: 'mtn_momo', phoneNumber: '0244123456' }),
      });
      if (res.ok) ok('Withdrawal request');
      else fail('Withdrawal request', data);
    } catch (e) { fail('Withdrawal request', e.message); }
  }

  if (demoToken) {
    try {
      const { res: mRes, data: matches } = await req('/matches/upcoming');
      const match = matches?.[0];
      const odds = match?.odds?.[0];
      if (match && odds) {
        const { res, data } = await req('/bets/place', {
          method: 'POST',
          headers: { Authorization: `Bearer ${demoToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stake: 5,
            selections: [{
              matchId: match.id,
              market: odds.market,
              selection: odds.selection,
            }],
          }),
        });
        if (res.ok && data.bookingCode) {
          ok(`Bet placed, booking code: ${data.bookingCode}`);
          const { res: bcRes, data: bcData } = await req(`/bets/booking/${data.bookingCode}`);
          if (bcRes.ok) ok('Booking code lookup');
          else fail('Booking code lookup', bcData);
        } else fail('Place bet / booking code', data);
      } else {
        ok('Place bet (skipped - no matches yet)');
      }
    } catch (e) { fail('Booking code', e.message); }
  }

  if (adminToken) {
    try {
      const { res, data } = await req('/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) ok('Admin dashboard');
      else fail('Admin dashboard', data);
    } catch (e) { fail('Admin dashboard', e.message); }
  }

  try {
    const email = `testuser${Date.now()}@test.com`;
    const { res, data } = await req('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'TestUser2024!',
        firstName: 'Test',
        lastName: 'User',
        phone: '0244999888',
      }),
    });
    if (res.ok && data.token) ok('User registration');
    else fail('User registration', data);
  } catch (e) { fail('User registration', e.message); }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
