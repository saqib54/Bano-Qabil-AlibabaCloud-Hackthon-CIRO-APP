/**
 * Smart Dispatch service — Sprint 9
 * Recommends the best department and staff for unassigned incidents
 * based on AI analysis, proximity, and current workload.
 */
const db = require('../../database/connection');

const DEPT_MAP = {
  FLOOD: 'RESCUE_1122',
  FIRE: 'FIRE',
  ACCIDENT: 'RESCUE_1122',
  MEDICAL: 'MEDICAL',
  POWER_OUTAGE: 'WAPDA',
  BUILDING_COLLAPSE: 'RESCUE_1122',
  GAS_LEAK: 'FIRE',
  SECURITY: 'POLICE',
  EXTREME_WEATHER: 'RESCUE_1122',
  OTHER: 'RESCUE_1122'
};

/**
 * Get dispatch recommendations for all unassigned incidents.
 * Returns incidents needing assignment with suggested department + available staff.
 */
function getDispatchRecommendations() {
  // Unassigned incidents (REPORTED, AI_ANALYZED, UNDER_REVIEW, VERIFIED — not yet ASSIGNED)
  const unassigned = db.prepare(`
    SELECT i.id, i.incident_number, i.title, i.category, i.status,
           i.latitude, i.longitude, i.location_name,
           i.ai_recommended_severity AS ai_severity, i.verified_severity,
           i.created_at, i.people_affected,
           ai.recommended_department, ai.secondary_department,
           ai.recommended_actions
    FROM incidents i
    LEFT JOIN incident_ai_analysis ai ON ai.incident_id = i.id
    WHERE i.status IN ('REPORTED','AI_ANALYZED','UNDER_REVIEW','VERIFIED')
    ORDER BY
      CASE
        WHEN i.verified_severity = 'CRITICAL' OR i.ai_recommended_severity = 'CRITICAL' THEN 1
        WHEN i.verified_severity = 'HIGH' OR i.ai_recommended_severity = 'HIGH' THEN 2
        WHEN i.verified_severity = 'MEDIUM' OR i.ai_recommended_severity = 'MEDIUM' THEN 3
        ELSE 4
      END,
      i.created_at ASC
    LIMIT 30
  `).all();

  return unassigned.map((inc) => {
    const suggestedDeptCode = inc.recommended_department
      ? findDeptCode(inc.recommended_department)
      : (DEPT_MAP[inc.category] || 'RESCUE_1122');

    const suggestedDept = db.prepare(
      'SELECT id, name, code FROM departments WHERE code = ? AND is_active = 1'
    ).get(suggestedDeptCode);

    // Available on-duty staff in suggested department
    const availableStaff = suggestedDept
      ? db.prepare(`
          SELECT sp.user_id, u.full_name, sp.designation, sp.duty_status
          FROM staff_profiles sp
          JOIN users u ON u.id = sp.user_id
          WHERE sp.department_id = ? AND sp.duty_status = 'ON_DUTY'
          LIMIT 5
        `).all(suggestedDept.id)
      : [];

    // Department workload (active incidents per department)
    const deptWorkload = db.prepare(`
      SELECT d.id, d.name, d.code,
             COUNT(CASE WHEN i.status IN ('ASSIGNED','ACCEPTED','EN_ROUTE','ON_SCENE') THEN 1 END) AS active_count,
             COUNT(CASE WHEN sp2.duty_status = 'ON_DUTY' THEN 1 END) AS available_staff
      FROM departments d
      LEFT JOIN incidents i ON i.assigned_department_id = d.id
      LEFT JOIN staff_profiles sp2 ON sp2.department_id = d.id AND sp2.duty_status = 'ON_DUTY'
      GROUP BY d.id
      ORDER BY d.name
    `).all();

    return {
      ...inc,
      suggestedDepartment: suggestedDept || null,
      availableStaff,
      deptWorkload
    };
  });
}

/**
 * Auto-assign a batch of incidents to their suggested departments.
 */
function autoAssignBatch(incidentIds) {
  const results = [];
  for (const incId of incidentIds) {
    const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incId);
    if (!inc) continue;
    if (!['REPORTED','AI_ANALYZED','UNDER_REVIEW','VERIFIED'].includes(inc.status)) {
      results.push({ id: incId, status: 'skipped', reason: 'Already assigned' });
      continue;
    }
    const deptCode = DEPT_MAP[inc.category] || 'RESCUE_1122';
    const dept = db.prepare('SELECT id FROM departments WHERE code = ? AND is_active = 1').get(deptCode);
    if (!dept) {
      results.push({ id: incId, status: 'skipped', reason: `No active department for ${deptCode}` });
      continue;
    }
    db.prepare(`
      UPDATE incidents SET assigned_department_id = ?, status = 'ASSIGNED', updated_at = datetime('now')
      WHERE id = ?
    `).run(dept.id, incId);
    const crypto = require('crypto');
    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, changed_by, notes)
      VALUES (?, ?, ?, 'ASSIGNED', NULL, ?)
    `).run(crypto.randomUUID(), incId, inc.status, `Auto-assigned to ${deptCode} by Smart Dispatch`);
    results.push({ id: incId, status: 'assigned', department: deptCode });
  }
  return results;
}

function findDeptCode(name) {
  if (!name) return null;
  const row = db.prepare('SELECT code FROM departments WHERE name = ? OR code = ?').get(name, name);
  return row?.code || null;
}

module.exports = { getDispatchRecommendations, autoAssignBatch };
