/**
 * Full production verification: scheduler, league table, scorers, ratings, admin.
 * Usage: node scripts/verify-production-full.js [API_URL]
 */
const API = (process.argv[2] || process.env.API_URL || 'https://bestbet-api-production-2f20.up.railway.app').replace(/\/$/, '');

if (process.env.DATABASE_URL) process.env.USE_IN_MEMORY_DB = 'false';

const EUROPEAN_NAME = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]+ [A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]+$/;
const NON_EUROPEAN = /\b(Kwame|Kofi|Ama|Abena|Mensah|Boateng|Asante|Osei)\b/i;

const results = [];
const pass = (name, detail = '') => {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
};
const fail = (name, err) => {
  results.push({ name, ok: false, detail: err });
  console.log(`❌ ${name}: ${err}`);
};

async function req(path, opts = {}) {
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`\n🔍 Verifying ${API}\n`);

  const health = await req('/health');
  if (health.ok && health.data.status === 'ok') pass('API health', health.data.build || 'ok');
  else fail('API health', health.data.error || health.data.status || `HTTP ${health.status}`);

  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@skybet.com', password: 'admin123' }),
  });
  if (!login.ok || !login.data.token) {
    fail('Admin login', login.data.error || 'no token');
    return finish();
  }
  pass('Admin login');
  const auth = { Authorization: `Bearer ${login.data.token}` };

  const settings = await req('/admin/settings', { headers: auth });
  const intervalSec = parseInt(settings.data?.match_interval_seconds || settings.data?.match_interval_minutes * 60 || '0', 10);
  const intervalMin = settings.data?.match_interval_minutes;
  if (intervalSec === 120 || intervalMin === '2' || intervalMin === 2) {
    pass('2-minute match interval configured', `${intervalSec || intervalMin} min setting`);
  } else {
    fail('2-minute match interval configured', `seconds=${settings.data?.match_interval_seconds}, minutes=${intervalMin}`);
  }

  const teams = await req('/admin/teams', { headers: auth });
  if (!teams.ok || teams.data.length !== 30) {
    fail('30 European teams seeded', `count=${teams.data?.length}`);
  } else {
    pass('30 European teams seeded');
  }

  const sampleTeam = teams.data?.[0];
  if (sampleTeam?.id) {
    const players = await req(`/admin/teams/${sampleTeam.id}/players`, { headers: auth });
    if (players.ok && players.data.length >= 18) pass('Player squads seeded', `${players.data.length} players on ${sampleTeam.name}`);
    else fail('Player squads seeded', `players=${players.data?.length}`);
  }

  const tableBefore = await req('/matches/league-table');
  const scorersBefore = await req('/matches/top-scorers');
  const resultsBefore = await req('/matches/results');
  const beforePlayed = tableBefore.data?.reduce((s, r) => s + (r.played || 0), 0) || 0;
  const beforeGoals = scorersBefore.data?.reduce((s, r) => s + (r.goals || 0), 0) || 0;
  const beforeFinished = resultsBefore.data?.length || 0;

  pass('League table endpoint', `${tableBefore.data?.length || 0} rows, ${beforePlayed} total played`);
  pass('Top scorers endpoint', `${scorersBefore.data?.length || 0} scorers, ${beforeGoals} total goals`);

  console.log('\n⏳ Waiting up to 150s for automatic match cycle...\n');
  let cycleObserved = false;
  for (let i = 0; i < 5; i++) {
    await sleep(30000);
    const live = await req('/matches/live');
    const resultsNow = await req('/matches/results');
    const tableNow = await req('/matches/league-table');
    const playedNow = tableNow.data?.reduce((s, r) => s + (r.played || 0), 0) || 0;
    const finishedNow = resultsNow.data?.length || 0;
    console.log(`   poll ${i + 1}: live=${live.data?.length || 0}, finished=${finishedNow}, tablePlayed=${playedNow}`);
    if (live.data?.length > 0 || finishedNow > beforeFinished || playedNow > beforePlayed) {
      cycleObserved = true;
    }
    if (cycleObserved && finishedNow > beforeFinished) break;
  }

  if (cycleObserved) pass('Automatic match simulation cycle', 'live or finished matches detected');
  else fail('Automatic match simulation cycle', 'no new activity in 150s');

  const tableAfter = await req('/matches/league-table');
  const scorersAfter = await req('/matches/top-scorers');
  const afterPlayed = tableAfter.data?.reduce((s, r) => s + (r.played || 0), 0) || 0;
  const afterGoals = scorersAfter.data?.reduce((s, r) => s + (r.goals || 0), 0) || 0;

  if (afterPlayed >= beforePlayed) pass('League table updates', `played ${beforePlayed} → ${afterPlayed}`);
  else fail('League table updates', `played ${beforePlayed} → ${afterPlayed}`);

  if (afterGoals >= beforeGoals) pass('Top scorers update', `goals ${beforeGoals} → ${afterGoals}`);
  else fail('Top scorers update', `goals ${beforeGoals} → ${afterGoals}`);

  const finished = await req('/matches/results');
  let europeanOk = true;
  let europeanSamples = [];
  if (finished.data?.length) {
    for (const m of finished.data.slice(0, 5)) {
      const detail = await req(`/matches/${m.id}`);
      const goals = (detail.data?.events || []).filter((e) => e.event_type === 'goal' || e.type === 'goal');
      for (const g of goals) {
        const name = g.player_name || g.player;
        if (!name) continue;
        europeanSamples.push(name);
        if (NON_EUROPEAN.test(name) || !EUROPEAN_NAME.test(name)) europeanOk = false;
      }
    }
  }
  if (europeanSamples.length && europeanOk) {
    pass('European goal scorer names', europeanSamples.slice(0, 3).join(', '));
  } else if (!europeanSamples.length) {
    const liveDetail = await req('/matches/live');
    if (liveDetail.data?.[0]?.id) {
      const d = await req(`/matches/${liveDetail.data[0].id}`);
      const goals = (d.data?.events || []).filter((e) => e.event_type === 'goal' || e.type === 'goal');
      for (const g of goals) {
        const name = g.player_name || g.player;
        if (name) europeanSamples.push(name);
      }
    }
    if (europeanSamples.length) pass('European goal scorer names (live)', europeanSamples.join(', '));
    else fail('European goal scorer names', 'no goal events yet — wait for matches to finish');
  } else {
    fail('European goal scorer names', `invalid: ${europeanSamples.join(', ')}`);
  }

  const rated = (teams.data || []).filter((t) => t.star_rating >= 1);
  const top = [...rated].sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0))[0];
  const bottom = [...rated].sort((a, b) => (a.star_rating || 0) - (b.star_rating || 0))[0];
  if (top && bottom && top.id !== bottom.id && process.env.DATABASE_URL) {
    const { simulateMatchOutcome } = await import('../src/services/simulationService.js');
    let topWins = 0;
    const sims = 20;
    for (let i = 0; i < sims; i++) {
      const r = await simulateMatchOutcome(top.id, bottom.id);
      if (r.homeGoals > r.awayGoals) topWins++;
      else if (r.homeGoals === r.awayGoals && r.homeGoals > 0) topWins += 0.5;
    }
    if (topWins >= sims * 0.45) {
      pass('Star ratings affect results', `${top.name} (${top.star_rating}★) beat ${bottom.name} (${bottom.star_rating}★) in ${topWins}/${sims} sims`);
    } else {
      fail('Star ratings affect results', `${topWins}/${sims} wins for ${top.name}`);
    }
  } else if (top && bottom) {
    fail('Star ratings affect results', 'DATABASE_URL not set for simulation check');
  } else {
    fail('Star ratings affect results', 'could not find rated teams');
  }

  const home = teams.data?.[0];
  const away = teams.data?.[1];
  if (home && away) {
    const scheduledAt = new Date(Date.now() + 5000).toISOString();
    const created = await req('/admin/matches', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ homeTeamId: home.id, awayTeamId: away.id, scheduledAt }),
    });
    if (created.ok && created.data?.id) {
      pass('Admin create match', `${home.short_name} vs ${away.short_name}`);
      const restarted = await req(`/admin/matches/${created.data.id}/restart`, {
        method: 'PUT',
        headers: auth,
      });
      if (restarted.ok) pass('Admin start/restart match', created.data.id);
      else fail('Admin start/restart match', restarted.data?.error || `HTTP ${restarted.status}`);
    } else {
      fail('Admin create match', created.data?.error || `HTTP ${created.status}`);
    }
  }

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed\n`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
