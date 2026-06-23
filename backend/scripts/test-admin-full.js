/**
 * Full admin API smoke test — run against local backend.
 * Usage: node scripts/test-admin-full.js
 */
const API = (process.env.API_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@skybet.com';
const PASS = process.env.ADMIN_PASSWORD || 'admin123';

let passed = 0;
let failed = 0;
let token = '';

function ok(n) { passed++; console.log(`✅ ${n}`); }
function fail(n, d) { failed++; console.error(`❌ ${n}`, d); }

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    signal: AbortSignal.timeout(15000),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

async function run() {
  console.log('🧪 Full Admin API Test\n');

  const health = await req('/health');
  if (health.status === 200 && health.data.database === 'connected') ok('Health + DB');
  else fail('Health', health);

  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (login.status === 200 && login.data.token) {
    token = login.data.token;
    ok(`Login HTTP 200 (${login.data.user?.role})`);
  } else fail('Login', login);

  const checks = [
    ['Dashboard', '/admin/dashboard'],
    ['Analytics', '/admin/analytics'],
    ['Users', '/admin/users'],
    ['Deposits', '/admin/deposits'],
    ['Withdrawals', '/admin/withdrawals'],
    ['Bets', '/admin/bets'],
    ['Matches', '/admin/matches'],
    ['Teams', '/admin/teams'],
    ['Leagues', '/admin/leagues'],
    ['Booking codes', '/admin/booking-codes'],
    ['Settings', '/admin/settings'],
  ];

  for (const [name, path] of checks) {
    const r = await req(path);
    if (r.status === 200) ok(name);
    else fail(name, r);
  }

  const teams = await req('/admin/teams');
  if (teams.status === 200 && teams.data.length >= 2) {
    const home = teams.data[0].id;
    const away = teams.data[1].id;
    const sched = new Date(Date.now() + 3600000).toISOString();
    const create = await req('/admin/matches', {
      method: 'POST',
      body: JSON.stringify({ homeTeamId: home, awayTeamId: away, scheduledAt: sched }),
    });
    if (create.status === 201) {
      ok('Create Match');
      const matchId = create.data.id;
      const edit = await req(`/admin/matches/${matchId}`, {
        method: 'PUT',
        body: JSON.stringify({ matchNumber: 99 }),
      });
      if (edit.status === 200) ok('Edit Match');
      else fail('Edit Match', edit);

      const odds = await req(`/admin/matches/${matchId}/odds`);
      if (odds.status === 200) ok('Edit Odds (read)');
      else fail('Edit Odds', odds);

      const pause = await req(`/admin/matches/${matchId}/pause`, {
        method: 'PUT',
        body: JSON.stringify({ paused: true }),
      });
      if (pause.status === 200) ok('Pause Match');
      else fail('Pause Match', pause);

      const league = await req('/admin/leagues', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test League', code: 'TL', description: 'test' }),
      });
      if (league.status === 201) ok('Create League');
      else fail('Create League', league);

      const del = await req(`/admin/matches/${matchId}`, { method: 'DELETE' });
      if (del.status === 200) ok('Delete Match');
      else fail('Delete Match', del);
    } else fail('Create Match', create);
  }

  console.log(`\n📊 ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
