const db = require('../../database/connection');

const incidentRepository = {
  findById(id) {
    return db.prepare(
      `SELECT i.*, u.full_name AS reporter_name, d.name AS department_name
       FROM incidents i
       JOIN users u ON u.id = i.reported_by
       LEFT JOIN departments d ON d.id = i.assigned_department_id
       WHERE i.id = ?`
    ).get(id);
  },

  findByNumber(incidentNumber) {
    return db.prepare('SELECT * FROM incidents WHERE incident_number = ?').get(incidentNumber);
  },

  listByReporter(userId) {
    return db.prepare(
      `SELECT i.*, d.name AS department_name
       FROM incidents i
       LEFT JOIN departments d ON d.id = i.assigned_department_id
       WHERE i.reported_by = ?
       ORDER BY i.created_at DESC`
    ).all(userId);
  },

  listAll({ status, category, severity, limit = 100 } = {}) {
    const clauses = [];
    const params = [];
    if (status) {
      clauses.push('i.status = ?');
      params.push(status);
    }
    if (category) {
      clauses.push('i.category = ?');
      params.push(category);
    }
    if (severity) {
      clauses.push('(i.verified_severity = ? OR (i.verified_severity IS NULL AND i.ai_recommended_severity = ?))');
      params.push(severity, severity);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return db.prepare(
      `SELECT i.*, u.full_name AS reporter_name, d.name AS department_name
       FROM incidents i
       JOIN users u ON u.id = i.reported_by
       LEFT JOIN departments d ON d.id = i.assigned_department_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT ?`
    ).all(...params, limit);
  },

  create(incident) {
    db.prepare(`
      INSERT INTO incidents (
        id, incident_number, reported_by, title, description, category, status,
        latitude, longitude, location_name, people_affected, contact_phone, extra_details
      ) VALUES (?, ?, ?, ?, ?, ?, 'REPORTED', ?, ?, ?, ?, ?, ?)
    `).run(
      incident.id,
      incident.incidentNumber,
      incident.reportedBy,
      incident.title,
      incident.description,
      incident.category,
      incident.latitude,
      incident.longitude,
      incident.locationName || null,
      incident.peopleAffected ?? null,
      incident.contactPhone || null,
      incident.extraDetails || null
    );
    return this.findById(incident.id);
  },

  updateStatus(id, status) {
    db.prepare(`
      UPDATE incidents
      SET status = ?,
          resolved_at = CASE WHEN ? = 'RESOLVED' THEN datetime('now') ELSE resolved_at END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(status, status, id);
  },

  addMedia({ id, incidentId, fileUrl, mimeType, sizeBytes, kind }) {
    db.prepare(`
      INSERT INTO incident_media (id, incident_id, file_url, mime_type, size_bytes, kind)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, incidentId, fileUrl, mimeType, sizeBytes, kind);
  },

  getMedia(incidentId) {
    return db.prepare('SELECT * FROM incident_media WHERE incident_id = ? ORDER BY created_at').all(incidentId);
  },

  addHistory({ id, incidentId, previousStatus, newStatus, changedBy, notes }) {
    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, changed_by, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, incidentId, previousStatus, newStatus, changedBy || null, notes || null);
  },

  getHistory(incidentId) {
    return db.prepare(
      `SELECT h.*, u.full_name AS changed_by_name, u.role AS changed_by_role
       FROM incident_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.incident_id = ?
       ORDER BY h.created_at ASC`
    ).all(incidentId);
  },

  countToday() {
    return db.prepare(
      `SELECT COUNT(*) AS n FROM incidents WHERE date(created_at) = date('now')`
    ).get().n;
  },

  // ── AI analysis ──────────────────────────────────────────

  saveAiAnalysis(analysis) {
    db.prepare(`
      INSERT INTO incident_ai_analysis (
        id, incident_id, ai_summary, recommended_severity, confidence,
        recommended_department, secondary_department, risk_tags,
        recommended_actions, reasoning_summary, model_name, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(incident_id) DO UPDATE SET
        ai_summary = excluded.ai_summary,
        recommended_severity = excluded.recommended_severity,
        confidence = excluded.confidence,
        recommended_department = excluded.recommended_department,
        secondary_department = excluded.secondary_department,
        risk_tags = excluded.risk_tags,
        recommended_actions = excluded.recommended_actions,
        reasoning_summary = excluded.reasoning_summary,
        model_name = excluded.model_name,
        status = excluded.status,
        error_message = excluded.error_message,
        updated_at = datetime('now')
    `).run(
      analysis.id, analysis.incidentId, analysis.aiSummary,
      analysis.recommendedSeverity, analysis.confidence,
      analysis.recommendedDepartment, analysis.secondaryDepartment,
      analysis.riskTags, analysis.recommendedActions,
      analysis.reasoningSummary, analysis.modelName,
      analysis.status, analysis.errorMessage
    );
  },

  getAiAnalysis(incidentId) {
    return db.prepare(
      'SELECT * FROM incident_ai_analysis WHERE incident_id = ?'
    ).get(incidentId) || null;
  },

  // ── Admin operations ────────────────────────────────────

  updateSeverity(id, severity) {
    db.prepare(`
      UPDATE incidents SET verified_severity = ?, updated_at = datetime('now') WHERE id = ?
    `).run(severity, id);
  },

  updateAiSeverity(id, severity) {
    db.prepare(`
      UPDATE incidents SET ai_recommended_severity = ?, updated_at = datetime('now') WHERE id = ?
    `).run(severity, id);
  },

  assignDepartment(id, departmentId) {
    db.prepare(`
      UPDATE incidents SET assigned_department_id = ?, updated_at = datetime('now') WHERE id = ?
    `).run(departmentId, id);
  },

  // ── Staff operations ─────────────────────────────────────

  listByStaff({ staffId, departmentId, status }) {
    const clauses = [];
    const params = [];
    // Incidents directly assigned OR in staff's department
    clauses.push('(i.current_assignment_id = ? OR i.assigned_department_id = ?)');
    params.push(staffId, departmentId);
    if (status) {
      clauses.push('i.status = ?');
      params.push(status);
    }
    const where = `WHERE ${clauses.join(' AND ')}`;
    return db.prepare(
      `SELECT i.*, u.full_name AS reporter_name, d.name AS department_name,
              ai.ai_summary, ai.recommended_severity AS ai_severity
       FROM incidents i
       JOIN users u ON u.id = i.reported_by
       LEFT JOIN departments d ON d.id = i.assigned_department_id
       LEFT JOIN incident_ai_analysis ai ON ai.incident_id = i.id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT 100`
    ).all(...params);
  },

  getStaffKpis(staffId, departmentId) {
    const assigned = db.prepare(
      `SELECT COUNT(*) AS n FROM incidents
       WHERE (current_assignment_id = ? OR assigned_department_id = ?)
       AND status IN ('ASSIGNED','ACCEPTED','EN_ROUTE','ON_SCENE','RESOLUTION_SUBMITTED')`
    ).get(staffId, departmentId).n;

    const enRoute = db.prepare(
      `SELECT COUNT(*) AS n FROM incidents
       WHERE (current_assignment_id = ? OR assigned_department_id = ?)
       AND status = 'EN_ROUTE'`
    ).get(staffId, departmentId).n;

    const onScene = db.prepare(
      `SELECT COUNT(*) AS n FROM incidents
       WHERE (current_assignment_id = ? OR assigned_department_id = ?)
       AND status = 'ON_SCENE'`
    ).get(staffId, departmentId).n;

    const completed = db.prepare(
      `SELECT COUNT(*) AS n FROM incidents
       WHERE (current_assignment_id = ? OR assigned_department_id = ?)
       AND status = 'RESOLVED'
       AND date(resolved_at) = date('now')`
    ).get(staffId, departmentId).n;

    return { assigned, enRoute, onScene, completed };
  },

  getStaffHistory(staffId, departmentId) {
    return db.prepare(
      `SELECT i.*, d.name AS department_name
       FROM incidents i
       LEFT JOIN departments d ON d.id = i.assigned_department_id
       WHERE (i.current_assignment_id = ? OR i.assigned_department_id = ?)
       AND i.status IN ('RESOLVED', 'REOPENED')
       ORDER BY i.resolved_at DESC
       LIMIT 50`
    ).all(staffId, departmentId);
  },

  addSituationLog({ id, incidentId, staffId, note, imageUrl }) {
    db.prepare(
      `INSERT INTO incident_situation_logs (id, incident_id, staff_id, note, image_url)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, incidentId, staffId || null, note, imageUrl || null);
  },

  getSituationLogs(incidentId) {
    return db.prepare(
      `SELECT sl.*, u.full_name AS staff_name
       FROM incident_situation_logs sl
       LEFT JOIN users u ON u.id = sl.staff_id
       WHERE sl.incident_id = ?
       ORDER BY sl.created_at ASC`
    ).all(incidentId);
  },

  submitResolution(incidentId, { notes, proofUrl, resourcesUsed, followUpRequired, resolvedBy }) {
    db.prepare(
      `UPDATE incidents SET
         resolution_notes = ?,
         resolution_proof_url = ?,
         resources_used = ?,
         follow_up_required = ?,
         resolved_by = ?,
         status = 'RESOLUTION_SUBMITTED',
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(notes, proofUrl || null, resourcesUsed || null, followUpRequired ? 1 : 0, resolvedBy || null, incidentId);
  },

  // ── Resolution review ───────────────────────────────────

  listResolutions() {
    return db.prepare(
      `SELECT i.*, u.full_name AS reporter_name, d.name AS department_name,
              r.full_name AS resolved_by_name
       FROM incidents i
       JOIN users u ON u.id = i.reported_by
       LEFT JOIN departments d ON d.id = i.assigned_department_id
       LEFT JOIN users r ON r.id = i.resolved_by
       WHERE i.status = 'RESOLUTION_SUBMITTED'
       ORDER BY i.updated_at DESC`
    ).all();
  },

  approveResolution(incidentId, notes, adminId) {
    db.transaction(() => {
      db.prepare(
        `UPDATE incidents SET status = 'RESOLVED', resolved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).run(incidentId);
      db.prepare(
        `INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, changed_by, notes)
         VALUES (?, ?, 'RESOLUTION_SUBMITTED', 'RESOLVED', ?, ?)`
      ).run(require('crypto').randomUUID(), incidentId, adminId, notes || 'Resolution approved by admin');
    })();
  },

  rejectResolution(incidentId, notes, adminId) {
    db.transaction(() => {
      db.prepare(
        `UPDATE incidents SET status = 'ON_SCENE', updated_at = datetime('now') WHERE id = ?`
      ).run(incidentId);
      db.prepare(
        `INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, changed_by, notes)
         VALUES (?, ?, 'RESOLUTION_SUBMITTED', 'ON_SCENE', ?, ?)`
      ).run(require('crypto').randomUUID(), incidentId, adminId, notes || 'Resolution rejected — more work required');
    })();
  },

  reopenIncident(incidentId, notes, adminId) {
    db.transaction(() => {
      db.prepare(
        `UPDATE incidents SET status = 'REOPENED', resolved_at = NULL, updated_at = datetime('now') WHERE id = ?`
      ).run(incidentId);
      db.prepare(
        `INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, changed_by, notes)
         VALUES (?, ?, 'RESOLVED', 'REOPENED', ?, ?)`
      ).run(require('crypto').randomUUID(), incidentId, adminId, notes || 'Incident reopened by admin');
    })();
  },

  updateDutyStatus(userId, status) {
    db.prepare(
      `UPDATE staff_profiles SET duty_status = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).run(status, userId);
  },

  // ── KPI aggregation ─────────────────────────────────────

  getCommandKpis() {
    const active = db.prepare(
      `SELECT COUNT(*) AS n FROM incidents WHERE status NOT IN ('RESOLVED','REJECTED','DUPLICATE','CANCELLED')`
    ).get().n;

    const critical = db.prepare(
      `SELECT COUNT(*) AS n FROM incidents
       WHERE status NOT IN ('RESOLVED','REJECTED','DUPLICATE','CANCELLED')
       AND (verified_severity = 'CRITICAL' OR (verified_severity IS NULL AND ai_recommended_severity = 'CRITICAL'))`
    ).get().n;

    const resolvedToday = db.prepare(
      `SELECT COUNT(*) AS n FROM incidents WHERE status = 'RESOLVED' AND date(resolved_at) = date('now')`
    ).get().n;

    const citizensAssisted = db.prepare(
      `SELECT COALESCE(SUM(people_affected), 0) AS n FROM incidents WHERE status = 'RESOLVED'`
    ).get().n;

    const respondersAvailable = db.prepare(
      `SELECT COUNT(*) AS n FROM staff_profiles WHERE duty_status = 'ON_DUTY'`
    ).get().n;

    const respondersDeployed = db.prepare(
      `SELECT COUNT(DISTINCT i.current_assignment_id) AS n FROM incidents i
       WHERE i.status IN ('ASSIGNED','ACCEPTED','EN_ROUTE','ON_SCENE')
       AND i.current_assignment_id IS NOT NULL`
    ).get().n;

    return {
      activeIncidents: active,
      criticalIncidents: critical,
      resolvedToday,
      citizensAssisted,
      respondersAvailable,
      respondersDeployed
    };
  },

  // ── Map data (Sprint 8) ──────────────────────────────────

  getMapIncidents({ activeOnly = true } = {}) {
    const where = activeOnly
      ? `WHERE i.status NOT IN ('RESOLVED','REJECTED','DUPLICATE','CANCELLED')`
      : '';
    return db.prepare(
      `SELECT i.id, i.incident_number, i.title, i.category, i.status,
              i.latitude, i.longitude, i.location_name,
              i.ai_recommended_severity, i.verified_severity,
              i.created_at, d.name AS department_name
       FROM incidents i
       LEFT JOIN departments d ON d.id = i.assigned_department_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT 200`
    ).all();
  },

  getMapResponders() {
    return db.prepare(
      `SELECT sp.user_id, u.full_name, sp.designation, sp.duty_status,
              sp.current_lat, sp.current_lng, sp.location_updated_at,
              d.name AS department_name, d.code AS department_code
       FROM staff_profiles sp
       JOIN users u ON u.id = sp.user_id
       LEFT JOIN departments d ON d.id = sp.department_id
       WHERE sp.duty_status IN ('ON_DUTY','DEPLOYED')`
    ).all();
  }
};

module.exports = incidentRepository;
