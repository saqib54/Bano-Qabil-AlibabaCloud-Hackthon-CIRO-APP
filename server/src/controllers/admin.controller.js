/**
 * Admin operations controller — incident verification, severity override,
 * department/staff assignment, and KPI aggregation (Sprint 4).
 */
const incidentService = require('../services/incident.service');
const db = require('../../database/connection');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const auditRepository = require('../repositories/audit.repository');

/** GET /api/v1/admin/incidents — full incident list with filters */
async function listIncidents(req, res) {
  const incidents = incidentService.listIncidentsAdmin(req.query);
  res.json({ success: true, message: 'All incidents', data: incidents });
}

/** GET /api/v1/admin/incidents/:id — detailed incident with AI analysis */
async function detail(req, res) {
  const incident = incidentService.getIncidentDetail(req.user, req.params.id);
  const aiAnalysis = incidentService.getAiAnalysis(req.params.id);
  res.json({
    success: true,
    message: 'Incident intelligence',
    data: { ...incident, ai_analysis: aiAnalysis }
  });
}

/** PATCH /api/v1/admin/incidents/:id/verify — verify + set severity */
async function verify(req, res) {
  const incident = incidentService.verifyIncident(
    req.user,
    req.params.id,
    req.body.severity,
    req.body.notes
  );
  res.json({ success: true, message: 'Incident verified', data: incident });
}

/** PATCH /api/v1/admin/incidents/:id/assign — assign department + staff */
async function assign(req, res) {
  const incident = incidentService.assignIncident(
    req.user,
    req.params.id,
    req.body.departmentId,
    req.body.staffId,
    req.body.notes
  );
  res.json({ success: true, message: 'Responder assigned', data: incident });
}

/** POST /api/v1/admin/incidents/:id/reanalyze — re-trigger AI analysis */
async function reanalyze(req, res) {
  const analysis = await incidentService.triggerAiAnalysis(req.params.id);
  res.json({ success: true, message: 'AI analysis complete', data: analysis });
}

/** GET /api/v1/admin/kpis — aggregated command center KPIs */
async function kpis(req, res) {
  const data = incidentService.getCommandKpis();
  res.json({ success: true, message: 'Command center KPIs', data });
}

// ── Resolution review (Sprint 6) ─────────────────────────

/** GET /api/v1/admin/resolutions */
async function listResolutions(req, res) {
  const data = incidentService.listResolutions();
  res.json({ success: true, message: 'Pending resolutions', data });
}

/** GET /api/v1/admin/resolutions/:id */
async function resolutionDetail(req, res) {
  const data = incidentService.getResolutionDetail(req.params.id);
  res.json({ success: true, message: 'Resolution detail', data });
}

/** PATCH /api/v1/admin/resolutions/:id/approve */
async function approveResolution(req, res) {
  const data = incidentService.approveResolution(req.user, req.params.id, req.body.notes);
  res.json({ success: true, message: 'Resolution approved — incident resolved', data });
}

/** PATCH /api/v1/admin/resolutions/:id/reject */
async function rejectResolution(req, res) {
  const data = incidentService.rejectResolution(req.user, req.params.id, req.body.notes);
  res.json({ success: true, message: 'Resolution rejected — returned to responder', data });
}

/** PATCH /api/v1/admin/resolutions/:id/reopen */
async function reopenIncident(req, res) {
  const data = incidentService.reopenIncident(req.user, req.params.id, req.body.notes);
  res.json({ success: true, message: 'Incident reopened', data });
}

// ── Staff management (Sprint 4) ──────────────────────

/** POST /api/v1/admin/staff — admin-only staff account creation */
async function createStaff(req, res) {
  const { fullName, email, phone, password, departmentId, designation } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(departmentId);
  if (!dept) throw ApiError.notFound('Department not found');

  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, full_name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'STAFF')
    `).run(id, fullName, email, phone || null, passwordHash);
    db.prepare(`
      INSERT INTO staff_profiles (user_id, department_id, designation, duty_status)
      VALUES (?, ?, ?, 'OFF_DUTY')
    `).run(id, departmentId, designation);
  })();

  auditRepository.log({
    actorId: req.user.id,
    action: 'STAFF_CREATE',
    entity: 'user',
    entityId: id,
    newValue: JSON.stringify({ email, department: dept.name, designation })
  });

  res.status(201).json({
    success: true,
    message: 'Staff account created',
    data: { id, fullName, email, designation, department: dept.name }
  });
}

/** GET /api/v1/admin/staff/detailed — staff with incident counts */
async function listStaffDetailed(req, res) {
  const staff = db.prepare(
    `SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.last_login_at,
            sp.designation, sp.duty_status, sp.department_id,
            d.name AS department_name, d.code AS department_code,
            (SELECT COUNT(*) FROM incidents WHERE current_assignment_id = u.id
             AND status IN ('ASSIGNED','ACCEPTED','EN_ROUTE','ON_SCENE')) AS active_incidents,
            (SELECT COUNT(*) FROM incidents WHERE current_assignment_id = u.id
             AND status = 'RESOLVED') AS resolved_count
     FROM users u
     JOIN staff_profiles sp ON sp.user_id = u.id
     LEFT JOIN departments d ON d.id = sp.department_id
     WHERE u.role = 'STAFF'
     ORDER BY sp.duty_status DESC, u.full_name`
  ).all();
  res.json({ success: true, message: 'Staff members', data: staff });
}

/** PATCH /api/v1/admin/staff/:id — account fields (name/email/password) + staff profile */
async function updateStaff(req, res) {
  const { id } = req.params;
  const profile = db.prepare('SELECT * FROM staff_profiles WHERE user_id = ?').get(id);
  if (!profile) throw ApiError.notFound('Staff member not found');

  const { fullName, email, password, designation, departmentId, dutyStatus } = req.body;

  // Account-level edits: name, email (uniqueness checked), password reset
  if (email) {
    const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
    if (clash) throw ApiError.conflict('Another account already uses this email');
  }
  const accountFields = [];
  const accountValues = [];
  if (fullName) { accountFields.push('full_name = ?'); accountValues.push(fullName); }
  if (email) { accountFields.push('email = ?'); accountValues.push(email); }
  if (password) { accountFields.push('password_hash = ?'); accountValues.push(bcrypt.hashSync(password, 10)); }
  if (accountFields.length > 0) {
    accountFields.push("updated_at = datetime('now')");
    accountValues.push(id);
    db.prepare(`UPDATE users SET ${accountFields.join(', ')} WHERE id = ?`).run(...accountValues);
    auditRepository.log({
      actorId: req.user.id,
      action: password ? 'STAFF_CREDENTIALS_UPDATE' : 'STAFF_ACCOUNT_UPDATE',
      entity: 'user',
      entityId: id,
      newValue: JSON.stringify({ fullName, email, passwordChanged: Boolean(password) })
    });
  }

  db.prepare(
    `UPDATE staff_profiles SET
       designation = COALESCE(?, designation),
       department_id = COALESCE(?, department_id),
       duty_status = COALESCE(?, duty_status),
       updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(designation || null, departmentId !== undefined ? departmentId : null, dutyStatus || null, id);

  const updated = db.prepare(
    `SELECT u.id, u.full_name, u.email, sp.designation, sp.duty_status, sp.department_id,
            d.name AS department_name
     FROM users u
     JOIN staff_profiles sp ON sp.user_id = u.id
     LEFT JOIN departments d ON d.id = sp.department_id
     WHERE u.id = ?`
  ).get(id);
  res.json({ success: true, message: 'Staff updated', data: updated });
}

// ── Citizen / account management ─────────────────

/** GET /api/v1/admin/users — list accounts (defaults to citizens, filter by role/search) */
async function listUsers(req, res) {
  const { role, search } = req.query;
  const params = [];
  let where = "WHERE u.role != 'ADMIN'";
  if (role && ['PUBLIC', 'STAFF', 'ADMIN'].includes(role)) {
    where = 'WHERE u.role = ?';
    params.push(role);
  }
  if (search) {
    where += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  const users = db.prepare(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.provider, u.avatar_url,
            u.is_active, u.terms_accepted_at, u.created_at, u.last_login_at,
            (SELECT COUNT(*) FROM incidents i WHERE i.reported_by = u.id) AS reports_count
     FROM users u
     ${where}
     ORDER BY u.created_at DESC`
  ).all(...params);
  res.json({ success: true, message: 'Accounts loaded', data: users });
}

/** POST /api/v1/admin/users — admin creates a citizen (or staff) account */
async function createUser(req, res) {
  const { fullName, email, phone, password, role = 'PUBLIC' } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, fullName, email, phone || null, bcrypt.hashSync(password, 10), role);

  if (role === 'STAFF') {
    db.prepare(`
      INSERT INTO staff_profiles (user_id, department_id, designation, duty_status)
      VALUES (?, NULL, 'Responder', 'OFF_DUTY')
    `).run(id);
  }

  auditRepository.log({
    actorId: req.user.id,
    action: 'USER_CREATE_BY_ADMIN',
    entity: 'user',
    entityId: id,
    newValue: JSON.stringify({ fullName, email, role })
  });

  res.status(201).json({
    success: true,
    message: 'Account created',
    data: { id, fullName, email, role }
  });
}

/** PATCH /api/v1/admin/users/:id — edit name/email/phone, reset password, enable/disable */
async function updateUser(req, res) {
  const { id } = req.params;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) throw ApiError.notFound('Account not found');

  const { fullName, email, phone, password, isActive } = req.body;

  if (target.role === 'ADMIN' && id !== req.user.id) {
    throw ApiError.forbidden('Admin accounts can only be edited by themselves');
  }
  if (isActive === false && id === req.user.id) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }
  if (email) {
    const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
    if (clash) throw ApiError.conflict('Another account already uses this email');
  }

  const fields = [];
  const values = [];
  const changes = {};
  if (fullName !== undefined) { fields.push('full_name = ?'); values.push(fullName); changes.fullName = true; }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); changes.email = true; }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone || null); changes.phone = true; }
  if (password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 10)); changes.passwordReset = true; }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); changes.isActive = isActive; }

  if (fields.length === 0) {
    return res.json({ success: true, message: 'Nothing to update', data: target });
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  auditRepository.log({
    actorId: req.user.id,
    action: changes.passwordReset ? 'USER_PASSWORD_RESET_BY_ADMIN' : 'USER_UPDATE_BY_ADMIN',
    entity: 'user',
    entityId: id,
    previousValue: JSON.stringify({ email: target.email, is_active: Boolean(target.is_active) }),
    newValue: JSON.stringify({ email, is_active: isActive, changes: Object.keys(changes) })
  });

  const updated = db.prepare(
    `SELECT id, full_name, email, phone, role, provider, avatar_url, is_active,
            terms_accepted_at, created_at, last_login_at FROM users WHERE id = ?`
  ).get(id);
  res.json({ success: true, message: 'Account updated', data: updated });
}

// ── Department management (Sprint 4) ─────────────────

/** GET /api/v1/admin/departments/detailed — departments with staff counts */
async function listDepartmentsDetailed(req, res) {
  const departments = db.prepare(
    `SELECT d.*,
            (SELECT COUNT(*) FROM staff_profiles sp WHERE sp.department_id = d.id) AS staff_count,
            (SELECT COUNT(*) FROM staff_profiles sp WHERE sp.department_id = d.id AND sp.duty_status = 'ON_DUTY') AS on_duty_count,
            (SELECT COUNT(*) FROM incidents i WHERE i.assigned_department_id = d.id
             AND i.status NOT IN ('RESOLVED','REJECTED','DUPLICATE','CANCELLED')) AS active_incidents
     FROM departments d
     ORDER BY d.name`
  ).all();
  res.json({ success: true, message: 'Departments', data: departments });
}

/** POST /api/v1/admin/departments */
async function createDepartment(req, res) {
  const { name, code, description, contact } = req.body;
  const existing = db.prepare('SELECT id FROM departments WHERE code = ? OR name = ?').get(code, name);
  if (existing) throw ApiError.badRequest('Department code or name already exists');

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO departments (id, name, code, description, contact)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, code, description || null, contact || null);

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
  res.status(201).json({ success: true, message: 'Department created', data: dept });
}

/** PATCH /api/v1/admin/departments/:id */
async function updateDepartment(req, res) {
  const { id } = req.params;
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
  if (!dept) throw ApiError.notFound('Department not found');

  const { name, description, contact } = req.body;
  db.prepare(
    `UPDATE departments SET
       name = COALESCE(?, name),
       description = COALESCE(?, description),
       contact = COALESCE(?, contact),
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(name || null, description !== undefined ? description : null, contact !== undefined ? contact : null, id);

  const updated = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
  res.json({ success: true, message: 'Department updated', data: updated });
}

/** PATCH /api/v1/admin/departments/:id/toggle */
async function toggleDepartment(req, res) {
  const { id } = req.params;
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
  if (!dept) throw ApiError.notFound('Department not found');

  const newState = dept.is_active ? 0 : 1;
  db.prepare(
    `UPDATE departments SET is_active = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newState, id);

  res.json({ success: true, message: `Department ${newState ? 'activated' : 'deactivated'}`, data: { id, is_active: newState } });
}

module.exports = {
  listIncidents: asyncHandler(listIncidents),
  detail: asyncHandler(detail),
  verify: asyncHandler(verify),
  assign: asyncHandler(assign),
  reanalyze: asyncHandler(reanalyze),
  kpis: asyncHandler(kpis),
  // Resolution
  listResolutions: asyncHandler(listResolutions),
  resolutionDetail: asyncHandler(resolutionDetail),
  approveResolution: asyncHandler(approveResolution),
  rejectResolution: asyncHandler(rejectResolution),
  reopenIncident: asyncHandler(reopenIncident),
  // Staff management (Sprint 4)
  createStaff: asyncHandler(createStaff),
  listStaffDetailed: asyncHandler(listStaffDetailed),
  updateStaff: asyncHandler(updateStaff),
  // Citizen / account management
  listUsers: asyncHandler(listUsers),
  createUser: asyncHandler(createUser),
  updateUser: asyncHandler(updateUser),
  // Department management (Sprint 4)
  listDepartmentsDetailed: asyncHandler(listDepartmentsDetailed),
  createDepartment: asyncHandler(createDepartment),
  updateDepartment: asyncHandler(updateDepartment),
  toggleDepartment: asyncHandler(toggleDepartment)
};
