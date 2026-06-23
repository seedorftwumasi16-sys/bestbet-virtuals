/**
 * Verify 30 teams, players, match engine, and API health locally or on production.
 * Usage: node scripts/verify-platform.js [API_URL]
 */
const API = (process.argv[2] || process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

async function req(path, opts = {}) {
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const results = [];
  const pass = (name) => { results.push({ name, ok: true }); console.log(`✅ ${name}`); };
  const fail = (name, err) => { results.push({ name, ok: false, err }); console.log(`❌ ${name}: ${err}`); };

  const health = await req('/health');
  if (health.ok && health.data.status === 'ok') pass(`Health (${API})`);
  else if (health.data.status === 'starting') fail('Health', 'API still starting');
  else fail('Health', health.data.error || `HTTP ${health.status}`);

  const leagues = await req('/matches/leagues');
  if (leagues.ok && Array.isArray(leagues.data)) {
    const total = leagues.data.reduce((s, l) => s + (l.team_count || 0), 0);
    if (total === 30) pass(`30 teams across leagues (${total})`);
    else fail('30 teams', `got ${total} teams`);
  } else fail('Leagues', leagues.data.error || 'failed');

  const upcoming = await req('/matches/upcoming');
  if (upcoming.ok && Array.isArray(upcoming.data)) pass(`Upcoming matches (${upcoming.data.length})`);
  else fail('Upcoming', upcoming.data.error);

  const live = await req('/matches/live');
  if (live.ok && Array.isArray(live.data)) pass(`Live matches (${live.data.length})`);
  else fail('Live', live.data.error);

  const table = await req('/matches/league-table');
  if (table.ok && Array.isArray(table.data) && table.data.length >= 30) pass(`League table (${table.data.length} rows)`);
  else fail('League table', `rows=${table.data?.length}`);

  const scorers = await req('/matches/top-scorers');
  if (scorers.ok && Array.isArray(scorers.data)) pass(`Top scorers (${scorers.data.length})`);
  else fail('Top scorers', scorers.data.error);

  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@skybet.com', password: 'admin123' }),
  });
  if (login.ok && login.data.token) {
    pass('Admin login');
    const teams = await req('/admin/teams', { headers: { Authorization: `Bearer ${login.data.token}` } });
    if (teams.ok && teams.data.length === 30) pass(`Admin teams (${teams.data.length})`);
    else fail('Admin teams', `count=${teams.data?.length}`);

    const withStars = teams.data?.filter((t) => t.star_rating >= 1 && t.star_rating <= 5).length || 0;
    if (withStars === 30) pass('Star ratings on all teams');
    else fail('Star ratings', `${withStars}/30`);

    if (teams.data?.[0]?.id) {
      const players = await req(`/admin/teams/${teams.data[0].id}/players`, {
        headers: { Authorization: `Bearer ${login.data.token}` },
      });
      if (players.ok && players.data.length >= 18) pass(`Squad size (${players.data.length} players)`);
      else fail('Squad', `players=${players.data?.length}`);
    }
  } else fail('Admin login', login.data.error);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
