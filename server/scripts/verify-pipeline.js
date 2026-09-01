/**
 * CIRO Rapid Intelligence Grid — end-to-end verification (§69).
 *
 * Flow: two independent citizens report the same FIRE event ~350 m apart.
 * The second report must corroborate the first → AUTO_VERIFIED verdict →
 * auto-routing + automatic public alert. The admin feed is checked last.
 *
 * Run: node scripts/verify-pipeline.js   (server must be running on :5000)
 */
const BASE = 'http://localhost:5000/api/v1';

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = new FormData();
    for (const [k, v] of Object.entries(form)) {
      if (v !== undefined && v !== null && v !== '') payload.append(k, v);
    }
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollVerification(token, incidentId, tries = 12) {
  for (let i = 0; i < tries; i += 1) {
    await sleep(700);
    const res = await api('GET', `/incidents/${incidentId}/verification`, { token });
    if (res.status === 200 && res.body?.data) return res.body.data;
  }
  return null;
}

async function main() {
  console.log('\n=== CIRO Rapid Intelligence Grid — end-to-end verification ===\n');

  // 1. Citizen A logs in (primary reporter)
  const a = await api('POST', '/auth/login', {
    body: { email: 'citizen@ciro.demo', password: 'Ciro@1234' }
  });
  check('citizen A login', a.status === 200 && a.body?.data?.accessToken, a.body?.message);
  const tokenA = a.body?.data?.accessToken;

  // 2. Register + login citizen B (independent witness)
  const stamp = Date.now();
  const witnessEmail = `witness.${stamp}@ciro.test`;
  const reg = await api('POST', '/auth/register', {
    body: {
      fullName: 'Pipeline Witness',
      email: witnessEmail,
      password: 'Witness@123',
      confirmPassword: 'Witness@123',
      phone: '03001234567'
    }
  });
  check('citizen B registered', reg.status === 201 || reg.status === 200, reg.body?.message);
  const b = await api('POST', '/auth/login', {
    body: { email: witnessEmail, password: 'Witness@123' }
  });
  check('citizen B login', b.status === 200 && b.body?.data?.accessToken, b.body?.message);
  const tokenB = b.body?.data?.accessToken;

  // 3. Citizen A reports a FIRE with strong urgency signals
  // (coordinates shift per run — keeps re-runs away from earlier test incidents)
  const jitter = (stamp % 40) / 100;
  const LAT = 33.68 + jitter;
  const LNG = 73.04 + jitter;
  const FIRE_FIELDS = {
    title: 'Massive market fire',
    description:
      'Large fire spreading through the market with heavy smoke filling the street. Several people trapped on the upper floor and an elderly man is unconscious near the entrance.',
    category: 'FIRE',
    latitude: LAT,
    longitude: LNG,
    locationName: 'Blue Area market, Islamabad',
    peopleAffected: 12,
    contactPhone: '03007654321'
  };
  const r1 = await api('POST', '/incidents', { token: tokenA, form: FIRE_FIELDS });
  check('incident A created', r1.status === 201 && r1.body?.data?.id, r1.body?.message);
  const idA = r1.body?.data?.id;

  // 4. Pipeline must finish within seconds
  const vA = await pollVerification(tokenA, idA);
  check('pipeline A completed', !!vA);
  if (vA) {
    check('pipeline A has 10 agent stages', (vA.stages || []).length === 10);
    check('pipeline A duration < 5s', vA.duration_ms < 5000, `${vA.duration_ms}ms`);
    check('pipeline A verdict present', !!vA.verdict, vA.verdict);
    console.log(`    → A: ${vA.verdict} @ ${vA.confidence}% confidence (${vA.duration_ms}ms)`);
  }

  // 5. Citizen B reports the same FIRE ~350 m away (corroboration)
  const r2 = await api('POST', '/incidents', {
    token: tokenB,
    form: {
      ...FIRE_FIELDS,
      title: 'Fire at Blue Area market',
      latitude: LAT + 0.0025,
      longitude: LNG + 0.003,
      locationName: 'Blue Area market entrance',
      peopleAffected: 15
    }
  });
  check('incident B created', r2.status === 201 && r2.body?.data?.id, r2.body?.message);
  const idB = r2.body?.data?.id;

  // 6. Pipeline B — expect corroboration → AUTO_VERIFIED → auto-alert
  const vB = await pollVerification(tokenB, idB);
  check('pipeline B completed', !!vB);
  if (vB) {
    console.log(`    → B: ${vB.verdict} @ ${vB.confidence}% confidence (${vB.duration_ms}ms)`);
    check('incident B corroborates A', vB.corroborating_count >= 1, `count=${vB.corroborating_count}`);
    check('incident B AUTO_VERIFIED', vB.verdict === 'AUTO_VERIFIED', vB.verdict);
    check('incident B severity HIGH+', ['HIGH', 'CRITICAL'].includes(vB.severity), vB.severity);
    check('incident B auto-routed to department', !!vB.auto_routed_department_id);
    check('incident B auto-alerted the public', vB.auto_alerted === true);
    check('pipeline B has 10 agent stages', (vB.stages || []).length === 10);
    check('pipeline B duration < 5s', vB.duration_ms < 5000, `${vB.duration_ms}ms`);
    const verdictStage = (vB.stages || []).find((s) => s.agent === 'VerdictEngine');
    check('VerdictEngine stage carries verdict + confidence', !!verdictStage?.verdict && typeof verdictStage?.confidence === 'number');
  }

  // 7. The AI-issued alert must be visible to the public
  const alerts = await api('GET', '/notifications/alerts', { token: tokenA });
  const aiAlert = (alerts.body?.data || []).find((x) => x.source === 'AI_PIPELINE');
  check('AI auto-alert visible to public', !!aiAlert, alerts.body?.message);
  if (aiAlert) console.log(`    → alert: "${aiAlert.title}" (${aiAlert.severity})`);

  // 8. Admin command feed + aggregate stats
  const adm = await api('POST', '/auth/login', {
    body: { email: 'msaqibali433@gmail.com', password: 'saqib@23' }
  });
  check('admin login', adm.status === 200 && adm.body?.data?.accessToken, adm.body?.message);
  const feed = await api('GET', '/admin/verification-feed?limit=10', {
    token: adm.body?.data?.accessToken
  });
  check(
    'admin verification feed',
    feed.status === 200 && Array.isArray(feed.body?.data?.runs),
    feed.body?.message
  );
  const stats = feed.body?.data?.stats || {};
  check('feed stats track runs', (stats.totalRuns || 0) >= 2, JSON.stringify(stats));
  console.log(`    → stats: ${JSON.stringify(stats)}`);

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Verification crashed:', err);
  process.exit(1);
});
