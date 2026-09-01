/**
 * Sprint 1 smoke test — verifies auth, RBAC and role redirects data.
 * Temporary script: delete after verification if desired.
 */
const BASE = 'http://localhost:5000/api/v1';

async function json(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures += 1;
}

(async () => {
  // 1. Admin login
  const admin = await json('POST', '/auth/login', { email: 'admin@ciro.demo', password: 'Ciro@1234' });
  check('admin login', admin.status === 200 && admin.body.data.user.role === 'ADMIN');
  const adminToken = admin.body.data.accessToken;

  // 2. Staff login (with staff_profile join)
  const staff = await json('POST', '/auth/login', { email: 'responder@ciro.demo', password: 'Ciro@1234' });
  check('staff login', staff.status === 200 && staff.body.data.user.role === 'STAFF');
  check('staff profile joined', staff.body.data.user.staff_profile?.department_name === 'Rescue 1122');
  const staffToken = staff.body.data.accessToken;

  // 3. Citizen login
  const citizen = await json('POST', '/auth/login', { email: 'citizen@ciro.demo', password: 'Ciro@1234' });
  check('citizen login', citizen.status === 200 && citizen.body.data.user.role === 'PUBLIC');
  const citizenToken = citizen.body.data.accessToken;

  // 4. /auth/me
  const me = await json('GET', '/auth/me', null, adminToken);
  check('me endpoint', me.status === 200 && me.body.data.email === 'admin@ciro.demo');

  // 5. RBAC: admin-only endpoint denies citizen & staff
  const denied1 = await json('GET', '/users', null, citizenToken);
  const denied2 = await json('GET', '/users', null, staffToken);
  check('RBAC blocks PUBLIC on /users', denied1.status === 403);
  check('RBAC blocks STAFF on /users', denied2.status === 403);
  const allowed = await json('GET', '/users', null, adminToken);
  check('RBAC allows ADMIN on /users', allowed.status === 200);

  // 6. No token => 401
  const anon = await json('GET', '/auth/me');
  check('missing token returns 401', anon.status === 401);

  // 7. Registration (citizen only) + role never trusted from client
  const email = `smoke_${Date.now()}@ciro.demo`;
  const reg = await json('POST', '/auth/register', {
    fullName: 'Smoke Tester',
    email,
    phone: '+92 300 0000000',
    password: 'Test@1234',
    confirmPassword: 'Test@1234',
    role: 'ADMIN' // must be ignored server-side
  });
  check('register succeeds', reg.status === 201);
  check('role forced to PUBLIC', reg.body.data.user.role === 'PUBLIC');

  // 8. Duplicate registration blocked
  const dup = await json('POST', '/auth/register', {
    fullName: 'Smoke Tester',
    email,
    password: 'Test@1234',
    confirmPassword: 'Test@1234'
  });
  check('duplicate email blocked', dup.status === 409);

  // 9. Validation errors shape
  const bad = await json('POST', '/auth/register', { fullName: 'x', email: 'nope', password: 'weak' });
  check('validation error shape', bad.status === 400 && Array.isArray(bad.body.errors));

  // 10. Refresh rotation
  const refresh = await json('POST', '/auth/refresh', { refreshToken: admin.body.data.refreshToken });
  check('refresh issues new tokens', refresh.status === 200 && refresh.body.data.accessToken);
  const reuse = await json('POST', '/auth/refresh', { refreshToken: admin.body.data.refreshToken });
  check('old refresh token revoked', reuse.status === 401);

  // 11. Logout revokes token
  const lo = await json('POST', '/auth/logout', { refreshToken: refresh.body.data.refreshToken });
  check('logout succeeds', lo.status === 200);
  const afterLogout = await json('POST', '/auth/refresh', { refreshToken: refresh.body.data.refreshToken });
  check('token invalid after logout', afterLogout.status === 401);

  // 12. Wrong password rejected
  const wrong = await json('POST', '/auth/login', { email: 'admin@ciro.demo', password: 'wrong' });
  check('wrong password rejected', wrong.status === 401);

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
