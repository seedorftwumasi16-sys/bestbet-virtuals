/**
 * Production smoke tests for SkyBet API
 */
const API_BASE = (process.env.API_URL || 'https://bestbet-api-production-2f20.up.railway.app').replace(/\/$/, '');
const API = `${API_BASE}/api`;

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
  console.log(`🧪 SkyBet Production API Tests\n   ${API}\n`);

  try {
    const { res, data } = await req('/health');
    if (res.ok && data.status === 'ok') ok(`Health check (${data.service || data.dbMode || 'ok'})`);
    else fail('Health check', data);
  } catch (e) { fail('Health check', e.message); }

  let adminToken;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@skybet.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  try {
    const { res, data } = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (res.ok && data.token) {
      adminToken = data.token;
      ok(`Admin login (${data.user?.role})`);
    } else fail('Admin login', data);
  } catch (e) { fail('Admin login', e.message); }

  try {
    const { res, data } = await req('/matches/leagues');
    if (res.ok && Array.isArray(data)) ok(`Leagues (${data.length})`);
    else fail('Leagues', data);
  } catch (e) { fail('Leagues', e.message); }

  try {
    const { res, data } = await req('/matches/league-stats');
    if (res.ok && data.match_interval_seconds) ok(`League stats (interval ${data.match_interval_seconds}s)`);
    else fail('League stats', data);
  } catch (e) { fail('League stats', e.message); }

  try {
    const { res, data } = await req('/matches/upcoming');
    if (res.ok && Array.isArray(data)) ok(`Upcoming matches (${data.length})`);
    else fail('Upcoming matches', data);
  } catch (e) { fail('Upcoming matches', e.message); }

  try {
    const { res, data } = await req('/matches/league-table');
    if (res.ok && Array.isArray(data)) ok(`League table (${data.length} teams)`);
    else fail('League table', data);
  } catch (e) { fail('League table', data);
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

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
