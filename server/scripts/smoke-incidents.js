/**
 * CIRO Sprint 2 — Incident System smoke test.
 * Verifies: report creation (with image), my reports, detail + timeline,
 * cancel transition, RBAC boundaries. Run: node scripts/smoke-incidents.js
 */
const BASE = 'http://localhost:5000/api/v1';
const PASSWORD = 'Ciro@1234';

// 1x1 transparent PNG
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD })
  });
  const json = await res.json();
  return { token: json.data.accessToken, user: json.data.user };
}

async function run() {
  console.log('CIRO Sprint 2 — Incident API smoke test\n');

  const citizen = await login('citizen@ciro.demo');
  const admin = await login('admin@ciro.demo');
  check('citizen + admin login', Boolean(citizen.token && admin.token));

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  // 1. Seeded data visible in /mine
  const mineRes = await fetch(`${BASE}/incidents/mine`, { headers: auth(citizen.token) });
  const mineJson = await mineRes.json();
  check('GET /incidents/mine returns 200', mineRes.status === 200);
  check('seeded demo incident present', mineJson.data.length >= 1);

  // 2. Create incident with multipart fields + image
  const form = new FormData();
  form.append('title', 'Smoke test kitchen fire');
  form.append('description', 'Small kitchen fire during automated smoke test run.');
  form.append('category', 'FIRE');
  form.append('latitude', '32.4999');
  form.append('longitude', '74.5400');
  form.append('locationName', 'Test Kitchen, Paris Road');
  form.append('peopleAffected', '2');
  form.append('contactPhone', '+92 300 1234567');
  form.append('image', new Blob([Buffer.from(PNG_B64, 'base64')], { type: 'image/png' }), 'test.png');

  const createRes = await fetch(`${BASE}/incidents`, { method: 'POST', headers: auth(citizen.token), body: form });
  const createJson = await createRes.json();
  check('POST /incidents returns 201', createRes.status === 201, `got ${createRes.status}: ${createJson.message}`);
  check('incident number issued', /^INC-\d{8}-\d{4}/.test(createJson.data?.incident_number || ''));
  const incidentId = createJson.data?.id;

  // 3. Detail includes timeline REPORTED + media row
  const detailRes = await fetch(`${BASE}/incidents/${incidentId}`, { headers: auth(citizen.token) });
  const detailJson = await detailRes.json();
  check('GET detail returns 200', detailRes.status === 200);
  check('timeline has REPORTED entry', detailJson.data.history?.some((h) => h.new_status === 'REPORTED'));
  check('uploaded image stored', detailJson.data.media?.length === 1);

  // 4. Upload served over HTTP
  const fileUrl = detailJson.data.media?.[0]?.file_url;
  const imgRes = await fetch(`http://localhost:5000${fileUrl}`);
  check('uploaded image retrievable', imgRes.status === 200);

  // 5. Invalid field rejected with shape
  const badForm = new FormData();
  badForm.append('title', 'x');
  badForm.append('category', 'FIRE');
  const badRes = await fetch(`${BASE}/incidents`, { method: 'POST', headers: auth(citizen.token), body: badForm });
  const badJson = await badRes.json();
  check('invalid report rejected 400 + errors array', badRes.status === 400 && Array.isArray(badJson.errors));

  // 6. RBAC: citizen cannot list all incidents
  const listAsCitizen = await fetch(`${BASE}/incidents`, { headers: auth(citizen.token) });
  check('citizen blocked from full list (403)', listAsCitizen.status === 403);

  // 7. Admin can list all and sees seeded + new incident
  const listAsAdmin = await fetch(`${BASE}/incidents`, { headers: auth(admin.token) });
  const listJson = await listAsAdmin.json();
  check('admin lists incidents', listAsAdmin.status === 200 && listJson.data.length >= 6);

  // 8. Citizen can cancel own REPORTED incident
  const cancelRes = await fetch(`${BASE}/incidents/${incidentId}/status`, {
    method: 'PATCH',
    headers: { ...auth(citizen.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED', notes: 'smoke test cleanup' })
  });
  check('citizen cancels own report', cancelRes.status === 200);

  // 9. Illegal transition blocked (CANCELLED → VERIFIED)
  const illegalRes = await fetch(`${BASE}/incidents/${incidentId}/status`, {
    method: 'PATCH',
    headers: { ...auth(admin.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'VERIFIED' })
  });
  check('illegal transition rejected (400)', illegalRes.status === 400);

  // 10. Staff cannot create incidents (PUBLIC-only endpoint)
  const staff = await login('responder@ciro.demo');
  const staffForm = new FormData();
  staffForm.append('title', 'staff should not create');
  staffForm.append('description', 'this must be rejected by RBAC rules.');
  staffForm.append('category', 'FIRE');
  staffForm.append('latitude', '32.5');
  staffForm.append('longitude', '74.5');
  const staffRes = await fetch(`${BASE}/incidents`, { method: 'POST', headers: auth(staff.token), body: staffForm });
  check('staff blocked from creating reports (403)', staffRes.status === 403);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
