/**
 * Production Live Match Editor API verification
 */
const BASE = (process.env.API_URL || 'https://bestbet-api-production-2f20.up.railway.app').replace(/\/$/, '');

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@skybet.com', password: 'admin123' }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error('Login failed');
  return data.token;
}

async function check(name, url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
  const ok = res.status >= 200 && res.status < 300;
  console.log(ok ? '✅' : '❌', res.status, name);
  if (!ok) console.log('   ', typeof body === 'string' ? body : body.error || body);
  return { ok, status: res.status, body };
}

async function main() {
  console.log(`\n🧪 Live Match Editor — ${BASE}\n`);

  const health = await check('Health', `${BASE}/api/health`);
  console.log('   build:', health.body?.build);

  const token = await login();
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  await check('Live editor module', `${BASE}/api/admin/live-editor/health`, { headers: h });
  await check('Admin matches', `${BASE}/api/admin/matches`, { headers: h });
  await check('Match history', `${BASE}/api/admin/matches/history/list?limit=5`, { headers: h });
  await check('Admin players', `${BASE}/api/admin/players`, { headers: h });

  const matchesRes = await fetch(`${BASE}/api/admin/matches`, { headers: h });
  const matches = await matchesRes.json();
  const m = matches.find((x) => x.status === 'live' || x.status === 'scheduled') || matches[0];
  if (!m) {
    console.log('⚠️ No matches to test goals');
    return;
  }

  const live = await check('Match live state', `${BASE}/api/admin/matches/${m.id}/live`, { headers: h });
  await check('Team players', `${BASE}/api/admin/teams/${m.home_team_id}/players`, { headers: h });

  const players = await (await fetch(`${BASE}/api/admin/teams/${m.home_team_id}/players`, { headers: h })).json();
  const scorer = players[0];

  const goalRes = await fetch(`${BASE}/api/admin/matches/${m.id}/goals`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      team: 'home',
      minute: 67,
      player: scorer?.name || 'Test Scorer',
      playerId: scorer?.id,
    }),
  });
  const goalBody = await goalRes.json().catch(async () => ({ raw: await goalRes.text() }));
  console.log(goalRes.ok ? '✅' : '❌', goalRes.status, 'POST Add Goal');
  console.log('\n📋 Add Goal API response:\n', JSON.stringify(goalBody, null, 2).slice(0, 1500));
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
