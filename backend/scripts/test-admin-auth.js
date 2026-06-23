/**
 * Admin authentication & dashboard API tests (local dev).
 * Usage: npm run test:admin
 * Env: API_URL=http://localhost:4000/api ADMIN_EMAIL ADMIN_PASSWORD
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const TEST_PORT = process.env.TEST_PORT || '4010';
const USE_EXTERNAL = Boolean(process.env.API_URL);
let API = (process.env.API_URL || `http://127.0.0.1:${TEST_PORT}/api`).replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@skybet.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let passed = 0;
let failed = 0;
let serverProc = null;

function ok(name) {
  passed++;
  console.log(`✅ ${name}`);
}

function fail(name, detail) {
  failed++;
  console.error(`❌ ${name}:`, detail);
}

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { res, data, status: res.status };
}

async function waitForHealth(maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const { res, data } = await req('/health');
      if (res.ok && data.status === 'ok') return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function startServerIfNeeded() {
  if (USE_EXTERNAL) {
    const healthy = await waitForHealth(10000);
    if (!healthy) throw new Error(`API not reachable at ${API}`);
    return;
  }

  console.log(`⏳ Starting isolated test server on port ${TEST_PORT}...`);
  const root = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.join(root, '..');
  serverProc = spawn('node', ['src/index.js'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      PORT: TEST_PORT,
      USE_IN_MEMORY_DB: 'true',
      DISABLE_RATE_LIMIT: 'true',
      NODE_ENV: 'development',
      ADMIN_EMAIL: ADMIN_EMAIL,
      ADMIN_PASSWORD: ADMIN_PASSWORD,
      ADMIN_RESET_PASSWORD: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const ready = await waitForHealth(45000);
  if (!ready) throw new Error('Test server failed to start within 45s');
  console.log('✅ Test server ready\n');
}

async function testRepeatedLogin() {
  for (let i = 0; i < 25; i++) {
    const { status, data } = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (status === 429) {
      fail(`Repeated login attempt ${i + 1}`, 'Rate limited (429)');
      return null;
    }
    if (status !== 200 || !data.token) {
      fail(`Repeated login attempt ${i + 1}`, data);
      return null;
    }
  }
  ok('25 consecutive admin logins without rate limit (all HTTP 200)');
  const { status, data } = await req('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (status === 200 && data.token) return data.token;
  fail('Final login for token', data);
  return null;
}

async function run() {
  console.log('🧪 SkyBet Admin Auth & Dashboard Tests\n');
  console.log(`   API: ${API}`);
  console.log(`   Admin: ${ADMIN_EMAIL}\n`);

  try {
    await startServerIfNeeded();
  } catch (e) {
    fail('Server startup', e.message);
    process.exit(1);
  }

  const token = await testRepeatedLogin();
  if (!token) {
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    await cleanup();
    process.exit(1);
  }
  ok('Admin login returns JWT (HTTP 200)');

  const auth = { Authorization: `Bearer ${token}` };

  try {
    const { status, data } = await req('/auth/me', { headers: auth });
    if (status === 200 && data.email === ADMIN_EMAIL && data.role === 'super_admin') {
      ok('JWT /auth/me validates session (super_admin role)');
    } else {
      fail('/auth/me', data);
    }
  } catch (e) {
    fail('/auth/me', e.message);
  }

  const adminEndpoints = [
    { name: 'Dashboard summary', path: '/admin/dashboard' },
    { name: 'Analytics', path: '/admin/analytics' },
    { name: 'Users list', path: '/admin/users' },
    { name: 'Deposits', path: '/admin/deposits' },
    { name: 'Withdrawals', path: '/admin/withdrawals' },
    { name: 'Bets', path: '/admin/bets' },
    { name: 'Live matches', path: '/admin/matches?status=live' },
    { name: 'Teams', path: '/admin/teams' },
    { name: 'Leagues', path: '/admin/leagues' },
    { name: 'Booking codes', path: '/admin/booking-codes' },
    { name: 'Settings', path: '/admin/settings' },
    { name: 'Roles', path: '/admin/roles' },
  ];

  for (const ep of adminEndpoints) {
    try {
      const { status, data } = await req(ep.path, { headers: auth });
      if (status === 200) ok(`${ep.name} (HTTP 200)`);
      else fail(ep.name, { status, data });
    } catch (e) {
      fail(ep.name, e.message);
    }
  }

  try {
    const { status, data } = await req('/admin/analytics', { headers: auth });
    if (status === 200 && data.totalWinnings !== undefined && data.matchStats) {
      ok(`Analytics includes winnings & match stats (winnings=${data.totalWinnings})`);
    } else {
      fail('Analytics fields', data);
    }
  } catch (e) {
    fail('Analytics fields', e.message);
  }

  try {
    const { status, data } = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'wrong-password' }),
    });
    if (status === 401) ok('Invalid password returns 401 (not rate limited)');
    else fail('Invalid password handling', { status, data });
  } catch (e) {
    fail('Invalid password handling', e.message);
  }

  if (!USE_EXTERNAL && serverProc) {
    try {
      serverProc.kill('SIGTERM');
      serverProc = null;
      await new Promise((r) => setTimeout(r, 800));
      await startServerIfNeeded();
      const { status, data } = await req('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      if (status === 200 && data.token && data.user?.role === 'super_admin') {
        ok('Admin login after server restart (HTTP 200, super_admin)');
      } else {
        fail('Login after restart', { status, data });
      }
    } catch (e) {
      fail('Login after restart', e.message);
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  await cleanup();
  process.exit(failed > 0 ? 1 : 0);
}

async function cleanup() {
  if (serverProc) {
    serverProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
}

run().catch(async (e) => {
  console.error(e);
  await cleanup();
  process.exit(1);
});
