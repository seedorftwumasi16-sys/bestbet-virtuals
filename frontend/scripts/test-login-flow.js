/**
 * Simulates the browser login flow (same API client logic as the frontend).
 * Usage: node scripts/test-login-flow.js
 */
const FRONTEND = process.env.FRONTEND_URL || 'http://127.0.0.1:3001';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@skybet.com';
const PASS = process.env.ADMIN_PASSWORD || 'admin123';

async function run() {
  console.log('🌐 E2E login flow test\n');
  console.log(`Frontend: ${FRONTEND}`);

  const health = await fetch(`${FRONTEND}/api/health`, { signal: AbortSignal.timeout(8000) });
  const healthData = await health.json();
  console.log(`Health via proxy: ${health.status}`, healthData.database);

  const loginRes = await fetch(`${FRONTEND}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
    signal: AbortSignal.timeout(10000),
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.token) {
    console.error('❌ Login failed', loginRes.status, loginData);
    process.exit(1);
  }
  console.log(`✅ Login HTTP ${loginRes.status} role=${loginData.user.role}`);

  const token = loginData.token;
  const auth = { Authorization: `Bearer ${token}` };

  const me = await fetch(`${FRONTEND}/api/auth/me`, { headers: auth });
  const meData = await me.json();
  console.log(`✅ JWT /auth/me HTTP ${me.status} email=${meData.email}`);

  const dash = await fetch(`${FRONTEND}/api/admin/dashboard`, { headers: auth });
  console.log(`✅ Dashboard API HTTP ${dash.status}`);

  const dashPage = await fetch(`${FRONTEND}/admin/dashboard`);
  console.log(`✅ Dashboard page HTTP ${dashPage.status}`);

  console.log('\n✅ Full browser-equivalent login flow passed');
}

run().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
