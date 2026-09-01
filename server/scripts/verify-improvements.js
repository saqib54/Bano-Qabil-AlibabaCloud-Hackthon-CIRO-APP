const BASE = 'http://localhost:5000/api/v1';

async function main() {
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
  };

  // 1. New admin login
  let adminToken = null;
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'msaqibali433@gmail.com', password: 'saqib@23' })
    });
    const body = await res.json();
    check('New admin login (msaqibali433@gmail.com)', res.ok && body.success, body.data?.user?.fullName + ' (' + body.data?.user?.role + ')');
    adminToken = body.data?.accessToken;
  } catch (e) {
    check('New admin login', false, e.message);
  }

  // 2. Old admin login must fail
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ciro.demo', password: 'Ciro@1234' })
    });
    check('Old admin login rejected', res.status === 401, 'status ' + res.status);
  } catch (e) {
    check('Old admin login rejected', false, e.message);
  }

  // 3. Citizen login still works
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@ciro.demo', password: 'Ciro@1234' })
    });
    const body = await res.json();
    check('Citizen login still works', res.ok, body.data?.user?.fullName);
  } catch (e) {
    check('Citizen login', false, e.message);
  }

  // 4. Public register creates PUBLIC role only
  try {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Registrant',
        email: 'test.registrant@example.com',
        password: 'Test@1234',
        confirmPassword: 'Test@1234'
      })
    });
    const body = await res.json();
    check('Public register → PUBLIC role only', res.ok && body.data?.user?.role === 'PUBLIC', 'role=' + body.data?.user?.role);
  } catch (e) {
    check('Public register', false, e.message);
  }

  // 5. Create staff account (admin only)
  if (adminToken) {
    try {
      const deptRes = await fetch(`${BASE}/admin/departments`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const deptBody = await deptRes.json();
      const dept = (deptBody.data || [])[0];

      const res = await fetch(`${BASE}/admin/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          fullName: 'Test Responder',
          email: 'test.responder@ciro.gov.pk',
          password: 'Respond@123',
          departmentId: dept.id,
          designation: 'Rescue Officer'
        })
      });
      const body = await res.json();
      check('Admin creates staff account', res.ok && body.success, body.data?.fullName + ' → ' + body.data?.department);

      // 6. New staff member can log in with given password
      const loginRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test.responder@ciro.gov.pk', password: 'Respond@123' })
      });
      const loginBody = await loginRes.json();
      check('New staff can log in via official portal', loginRes.ok && loginBody.data?.user?.role === 'STAFF', loginBody.data?.user?.fullName);

      // 7. Duplicate email rejected
      const dupRes = await fetch(`${BASE}/admin/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          fullName: 'Test Responder',
          email: 'test.responder@ciro.gov.pk',
          password: 'Respond@123',
          departmentId: dept.id,
          designation: 'Rescue Officer'
        })
      });
      check('Duplicate staff email rejected', dupRes.status === 409, 'status ' + dupRes.status);

      // 8. Citizen cannot create staff
      const citLogin = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'citizen@ciro.demo', password: 'Ciro@1234' })
      });
      const citBody = await citLogin.json();
      const forbidden = await fetch(`${BASE}/admin/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${citBody.data.accessToken}` },
        body: JSON.stringify({
          fullName: 'Hacker Attempt',
          email: 'hacker@evil.com',
          password: 'Hack@123',
          departmentId: dept.id,
          designation: 'Infiltrator'
        })
      });
      check('Citizen blocked from creating staff', forbidden.status === 403, 'status ' + forbidden.status);

      // 9. Audit log recorded the staff creation
      const auditRes = await fetch(`${BASE}/admin/audit?entity=user&limit=5`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const auditBody = await auditRes.json();
      const hasCreate = (auditBody.data?.rows || []).some((r) => r.action === 'STAFF_CREATE');
      check('Staff creation audited', hasCreate);
    } catch (e) {
      check('Staff creation flow', false, e.message);
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log('\n' + (failed === 0 ? 'ALL ' + results.length + ' TESTS PASSED' : failed + ' TESTS FAILED'));
  process.exit(failed === 0 ? 0 : 1);
}

main();
