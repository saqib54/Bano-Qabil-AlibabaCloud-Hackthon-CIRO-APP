/**
 * Smoke test: admin account management + citizen prefs/terms/avatar endpoints.
 * Run: node scripts/smoke-accounts.js
 */
const BASE = 'http://localhost:5000/api/v1';
const ADMIN_EMAIL = 'smoke.admin@ciro.demo';
const ADMIN_PASSWORD = 'Smoke@Admin1';

async function req(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form; // FormData — fetch sets multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${extra ? ` (${extra})` : ''}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  // 0. Ensure a dedicated smoke-test admin exists (idempotent)
  const db = require('../database/connection');
  const bcrypt = require('bcryptjs');
  const crypto = require('crypto');
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ?, is_active = 1 WHERE id = ?')
      .run(bcrypt.hashSync(ADMIN_PASSWORD, 10), 'ADMIN', existing.id);
  } else {
    db.prepare('INSERT INTO users (id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), 'Smoke Admin', ADMIN_EMAIL, bcrypt.hashSync(ADMIN_PASSWORD, 10), 'ADMIN');
  }

  // 1. Admin login
  const login = await req('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  check('admin login', login.status === 200, `status ${login.status}`);
  const adminToken = login.json.data?.accessToken;

  // 2. List accounts
  const list = await req('GET', '/admin/users', { token: adminToken });
  check('admin list users', list.status === 200, `${list.json.data?.length} accounts`);

  // 3. Create a citizen account
  const stamp = Date.now().toString(36);
  const email = `smoke.${stamp}@test.ciro`;
  const create = await req('POST', '/admin/users', {
    token: adminToken,
    body: { fullName: 'Smoke Citizen', email, phone: '+92 300 1112223', password: 'Smoke@123', role: 'PUBLIC' }
  });
  check('admin create citizen', create.status === 201, `status ${create.status}`);
  const userId = create.json.data?.id;

  // 4. Edit the citizen: new email + password reset + name
  const newEmail = `smoke2.${stamp}@test.ciro`;
  const edit = await req('PATCH', `/admin/users/${userId}`, {
    token: adminToken,
    body: { fullName: 'Smoke Citizen Renamed', email: newEmail, password: 'Smoke@456' }
  });
  check('admin edit citizen (email+password)', edit.status === 200, `status ${edit.status}`);

  // 5. Citizen can log in with the NEW credentials
  const citizenLogin = await req('POST', '/auth/login', { body: { email: newEmail, password: 'Smoke@456' } });
  check('citizen login with reset credentials', citizenLogin.status === 200, `status ${citizenLogin.status}`);
  const citizenToken = citizenLogin.json.data?.accessToken;
  check('session includes prefs object', typeof citizenLogin.json.data?.user?.prefs === 'object');

  // 6. Citizen saves preferences (theme + language)
  const prefs = await req('PATCH', '/users/prefs', {
    token: citizenToken,
    body: { prefs: { theme: 'dark', lang: 'ur', evilKey: 'ignored' } }
  });
  check('citizen save prefs', prefs.status === 200 && prefs.json.data?.prefs?.theme === 'dark', JSON.stringify(prefs.json.data?.prefs));
  check('prefs whitelist blocks unknown keys', prefs.json.data?.prefs?.evilKey === undefined);

  // 7. Citizen accepts terms (once)
  const terms = await req('POST', '/users/terms/accept', { token: citizenToken });
  check('citizen accept terms', terms.status === 200 && Boolean(terms.json.data?.terms_accepted_at), terms.json.data?.terms_accepted_at);

  // 8. Profile reflects prefs + terms
  const profile = await req('GET', '/users/profile', { token: citizenToken });
  check('profile shows saved prefs', profile.json.data?.prefs?.lang === 'ur');
  check('profile shows terms date', Boolean(profile.json.data?.terms_accepted_at));

  // 9. Avatar upload (tiny generated png via FormData)
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const form = new FormData();
  form.append('avatar', new Blob([pngBytes], { type: 'image/png' }), 'avatar.png');
  const avatar = await req('POST', '/users/profile/avatar', { token: citizenToken, form });
  check('citizen avatar upload', avatar.status === 200 && avatar.json.data?.avatar_url?.includes('/uploads/avatars/'), avatar.json.data?.avatar_url);

  // 10. Staff edit with email + password reset (uses /admin/staff/:id)
  const staffList = await req('GET', '/admin/staff', { token: adminToken });
  const staff = staffList.json.data?.[0];
  if (staff) {
    const staffEdit = await req('PATCH', `/admin/staff/${staff.id}`, {
      token: adminToken,
      body: { fullName: staff.full_name, email: staff.email, password: 'Staff@12345' }
    });
    check('admin edit staff credentials', staffEdit.status === 200, `status ${staffEdit.status}`);
  } else {
    console.log('SKIP — no staff member found to test credential edit');
  }

  console.log('\nSmoke test complete.');
})().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exitCode = 1;
});
