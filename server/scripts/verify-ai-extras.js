/** Spot-check the new AI triage endpoints (§71): extract / forecast / approve-dispatch. */
const BASE = 'http://localhost:5000/api/v1';

let passed = 0;
let failed = 0;
function check(name, ok, extra = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

(async () => {
  console.log('=== AI Triage spot-check ===\n');

  // Admin login
  const login = await api('POST', '/auth/login', null, {
    email: 'msaqibali433@gmail.com',
    password: 'saqib@23'
  });
  check('admin login', login.status === 200);
  const token = login.body?.data?.accessToken;

  // 1. Roman-Urdu extraction — the exact example from the spec
  const ex = await api('POST', '/ai/extract', token, {
    text: 'Lahore Ring Road par accident hua hai, do log injured hain.'
  });
  check('/ai/extract returns 200', ex.status === 200);
  const d = ex.body?.data || {};
  console.log('    →', JSON.stringify(d, null, 0).slice(0, 300));
  check('detects ACCIDENT category', d.category === 'ACCIDENT', d.category);
  check('extracts Lahore Ring Road location', /Lahore[, ]+Ring Road/i.test(d.locationName || ''), d.locationName);
  check('extracts 2 people (do log)', d.peopleAffected === 2, d.peopleAffected);
  check('priority HIGH', d.priority === 'HIGH', d.priority);
  check('suggests Ambulance team', /Ambulance/i.test(d.suggestedTeam || ''), d.suggestedTeam);
  check('instant safety response present', typeof d.safetyResponse === 'string' && d.safetyResponse.length > 10);

  // Urdu-script extraction
  const exUr = await api('POST', '/ai/extract', token, { text: 'مارکیٹ کے قریب آگ لگ گئی ہے' });
  check('Urdu script detects FIRE', exUr.body?.data?.category === 'FIRE', exUr.body?.data?.category);

  // 2. Forecast hotspots
  const fc = await api('GET', '/admin/forecast?days=365', token);
  check('/admin/forecast returns 200', fc.status === 200);
  const hotspots = fc.body?.data?.hotspots || [];
  check('forecast produces hotspots', hotspots.length > 0, `count=${hotspots.length}`);
  if (hotspots[0]) {
    console.log('    → top hotspot:', JSON.stringify(hotspots[0]));
    check('hotspot has risk score', typeof hotspots[0].risk_score === 'number');
  }

  // 3. Approve & dispatch on a reviewed incident
  const feed = await api('GET', '/admin/verification-feed?limit=20', token);
  const run = (feed.body?.data?.runs || []).find((r) => r.incident_id && r.verdict !== 'SUSPECTED_DUPLICATE');
  check('feed has a runnable incident', !!run);
  if (run) {
    const ap = await api('POST', `/admin/incidents/${run.incident_id}/approve-dispatch`, token);
    check('approve-dispatch returns 200', ap.status === 200, `status=${ap.status} ${ap.body?.message || ''}`);
    const inc = ap.body?.data || {};
    check('incident now VERIFIED', inc.status === 'VERIFIED', inc.status);
    check('dispatch approver recorded', !!inc.dispatch_approved_by);
    check('impact_shape parsed in feed', !run || typeof run.impact_shape !== 'string' || run.impact_shape === null || typeof run.impact_shape === 'object');
  }

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
