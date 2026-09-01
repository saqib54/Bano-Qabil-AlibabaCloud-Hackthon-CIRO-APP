const crypto = require('crypto');
const db = require('../../database/connection');
const ApiError = require('../utils/ApiError');
const incidentRepository = require('../repositories/incident.repository');
const qwenService = require('./qwen.service');
const aiPipelineService = require('./aiPipeline.service');

/**
 * Allowed status transitions (§24). Backend is the single source of
 * truth — e.g. REPORTED → RESOLVED is impossible here.
 */
const TRANSITIONS = {
  REPORTED: ['AI_ANALYZED', 'UNDER_REVIEW', 'REJECTED', 'DUPLICATE', 'CANCELLED'],
  AI_ANALYZED: ['UNDER_REVIEW', 'REJECTED', 'DUPLICATE'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED', 'DUPLICATE'],
  VERIFIED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ACCEPTED', 'VERIFIED', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE', 'ON_SCENE'],
  EN_ROUTE: ['ON_SCENE'],
  ON_SCENE: ['RESOLUTION_SUBMITTED'],
  RESOLUTION_SUBMITTED: ['RESOLVED', 'ON_SCENE', 'REOPENED'],
  RESOLVED: ['REOPENED'],
  REOPENED: ['UNDER_REVIEW', 'ASSIGNED'],
  REJECTED: ['UNDER_REVIEW'],
  DUPLICATE: [],
  CANCELLED: []
};

/** Which roles may drive which transitions. */
const ROLE_ALLOWED = {
  ADMIN: Object.keys(TRANSITIONS),
  STAFF: ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'RESOLUTION_SUBMITTED'],
  PUBLIC: ['CANCELLED']
};

function generateIncidentNumber() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todays = incidentRepository.countToday() + 1;
  const number = `INC-${day}-${String(todays).padStart(4, '0')}`;
  // Extremely unlikely collision; guard anyway.
  return incidentRepository.findByNumber(number) ? `${number}-${crypto.randomUUID().slice(0, 4)}` : number;
}

function createIncident(user, body, file) {
  const incident = db.transaction(() => {
    const created = incidentRepository.create({
      id: crypto.randomUUID(),
      incidentNumber: generateIncidentNumber(),
      reportedBy: user.id,
      title: body.title,
      description: body.description,
      category: body.category,
      latitude: body.latitude,
      longitude: body.longitude,
      locationName: body.locationName,
      peopleAffected: body.peopleAffected,
      contactPhone: body.contactPhone,
      extraDetails: body.extraDetails
    });

    if (file) {
      incidentRepository.addMedia({
        id: crypto.randomUUID(),
        incidentId: created.id,
        fileUrl: `/uploads/incidents/${file.filename}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        kind: 'REPORT'
      });
    }

    incidentRepository.addHistory({
      id: crypto.randomUUID(),
      incidentId: created.id,
      previousStatus: null,
      newStatus: 'REPORTED',
      changedBy: user.id,
      notes: 'Emergency report submitted by citizen'
    });

    return created;
  })();

  // Rapid Intelligence Grid — fire-and-forget; failure never blocks the report (§69).
  // The pipeline runs AI triage, then the five verification agents, then
  // auto-routes + auto-alerts when confidence is high. Completes in seconds.
  aiPipelineService.runVerificationPipeline(incident.id).catch((err) =>
    console.error('[incident] verification pipeline failed:', err.message)
  );

  return incidentRepository.findById(incident.id);
}

function getMyIncidents(user) {
  return incidentRepository.listByReporter(user.id);
}

function getIncidentDetail(user, incidentId) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  // Citizens may only see their own reports; staff/admin see all.
  if (user.role === 'PUBLIC' && incident.reported_by !== user.id) {
    throw ApiError.forbidden('You do not have access to this incident');
  }

  const publicView = user.role === 'PUBLIC';
  return {
    ...incident,
    contact_phone: incident.contact_phone,
    reporter_name: publicView ? undefined : incident.reporter_name,
    media: incidentRepository.getMedia(incidentId),
    history: incidentRepository.getHistory(incidentId),
    ai_analysis: incidentRepository.getAiAnalysis(incidentId)
  };
}

function listIncidents(query) {
  return incidentRepository.listAll({
    status: query.status,
    category: query.category
  });
}

function updateStatus(user, incidentId, newStatus, notes) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  const allowed = TRANSITIONS[incident.status] || [];
  if (!allowed.includes(newStatus)) {
    throw ApiError.badRequest(
      `Invalid status transition: ${incident.status} → ${newStatus}`
    );
  }

  const roleAllowed = ROLE_ALLOWED[user.role] || [];
  if (!roleAllowed.includes(newStatus)) {
    throw ApiError.forbidden('Your role cannot perform this status change');
  }

  // Citizens can only cancel their own reports
  if (user.role === 'PUBLIC' && incident.reported_by !== user.id) {
    throw ApiError.forbidden('You do not have access to this incident');
  }

  db.transaction(() => {
    incidentRepository.updateStatus(incidentId, newStatus);
    incidentRepository.addHistory({
      id: crypto.randomUUID(),
      incidentId,
      previousStatus: incident.status,
      newStatus,
      changedBy: user.id,
      notes
    });
  })();

  return incidentRepository.findById(incidentId);
}

module.exports = {
  createIncident,
  getMyIncidents,
  getIncidentDetail,
  listIncidents,
  listIncidentsAdmin,
  updateStatus,
  verifyIncident,
  assignIncident,
  triggerAiAnalysis,
  getAiAnalysis,
  getCommandKpis,
  // Staff
  getStaffAssignments,
  getStaffAssignmentDetail,
  acceptAssignment,
  staffUpdateStatus,
  addSituationLog,
  submitResolution,
  getStaffKpis,
  getStaffHistory,
  toggleDutyStatus,
  // Resolution
  listResolutions,
  getResolutionDetail,
  approveResolution,
  rejectResolution,
  reopenIncident,
  // Map (Sprint 8)
  getMapIncidents,
  getMapResponders,
  TRANSITIONS
};

// ── Admin listing with richer filters ──────────────────────

function listIncidentsAdmin(query) {
  return incidentRepository.listAll({
    status: query.status,
    category: query.category,
    severity: query.severity,
    limit: parseInt(query.limit || '100', 10)
  });
}

// ── Admin: verify incident ─────────────────────────────────

function verifyIncident(user, incidentId, severity, notes) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  if (user.role !== 'ADMIN') {
    throw ApiError.forbidden('Only admins can verify incidents');
  }

  db.transaction(() => {
    incidentRepository.updateSeverity(incidentId, severity);
    // If still in REPORTED/AI_ANALYZED, move to UNDER_REVIEW → VERIFIED
    if (['REPORTED', 'AI_ANALYZED'].includes(incident.status)) {
      incidentRepository.updateStatus(incidentId, 'UNDER_REVIEW');
      incidentRepository.addHistory({
        id: crypto.randomUUID(), incidentId,
        previousStatus: incident.status, newStatus: 'UNDER_REVIEW',
        changedBy: user.id, notes: 'Moved to review for verification'
      });
      incidentRepository.updateStatus(incidentId, 'VERIFIED');
      incidentRepository.addHistory({
        id: crypto.randomUUID(), incidentId,
        previousStatus: 'UNDER_REVIEW', newStatus: 'VERIFIED',
        changedBy: user.id,
        notes: notes || `Severity verified as ${severity} by command staff`
      });
    } else if (incident.status === 'UNDER_REVIEW') {
      incidentRepository.updateStatus(incidentId, 'VERIFIED');
      incidentRepository.addHistory({
        id: crypto.randomUUID(), incidentId,
        previousStatus: 'UNDER_REVIEW', newStatus: 'VERIFIED',
        changedBy: user.id,
        notes: notes || `Severity verified as ${severity} by command staff`
      });
    } else {
      // Just update severity without changing status
      incidentRepository.addHistory({
        id: crypto.randomUUID(), incidentId,
        previousStatus: incident.status, newStatus: incident.status,
        changedBy: user.id,
        notes: `Severity overridden to ${severity} by admin`
      });
    }
  })();

  return incidentRepository.findById(incidentId);
}

// ── Admin: assign department ──────────────────────────────

function assignIncident(user, incidentId, departmentId, staffId, notes) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  if (user.role !== 'ADMIN') {
    throw ApiError.forbidden('Only admins can assign departments');
  }

  db.transaction(() => {
    incidentRepository.assignDepartment(incidentId, departmentId);

    // Move to ASSIGNED if currently VERIFIED
    if (incident.status === 'VERIFIED') {
      incidentRepository.updateStatus(incidentId, 'ASSIGNED');
      incidentRepository.addHistory({
        id: crypto.randomUUID(), incidentId,
        previousStatus: 'VERIFIED', newStatus: 'ASSIGNED',
        changedBy: user.id,
        notes: notes || 'Department assigned by command center'
      });
    } else {
      incidentRepository.addHistory({
        id: crypto.randomUUID(), incidentId,
        previousStatus: incident.status, newStatus: incident.status,
        changedBy: user.id,
        notes: `Department reassigned by admin`
      });
    }
  })();

  return incidentRepository.findById(incidentId);
}

// ── AI analysis ─────────────────────────────────────────────

async function triggerAiAnalysis(incidentId) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  const result = await qwenService.analyseIncident(incident);

  const analysis = {
    id: crypto.randomUUID(),
    incidentId,
    ...result
  };

  incidentRepository.saveAiAnalysis(analysis);

  // Also update the incident's ai_recommended_severity
  if (result.recommendedSeverity) {
    incidentRepository.updateAiSeverity(incidentId, result.recommendedSeverity);
  }

  // If incident was REPORTED and AI succeeded, move to AI_ANALYZED
  if (incident.status === 'REPORTED' && result.status === 'COMPLETED') {
    db.transaction(() => {
      incidentRepository.updateStatus(incidentId, 'AI_ANALYZED');
      incidentRepository.addHistory({
        id: crypto.randomUUID(), incidentId,
        previousStatus: 'REPORTED', newStatus: 'AI_ANALYZED',
        changedBy: null,
        notes: `AI analysis complete — recommended ${result.recommendedSeverity}`
      });
    })();
  }

  return incidentRepository.getAiAnalysis(incidentId);
}

function getAiAnalysis(incidentId) {
  const analysis = incidentRepository.getAiAnalysis(incidentId);
  if (!analysis) return null;
  return {
    ...analysis,
    risk_tags: safeJsonParse(analysis.risk_tags, []),
    recommended_actions: safeJsonParse(analysis.recommended_actions, [])
  };
}

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── KPIs ───────────────────────────────────────────────────

function getCommandKpis() {
  return incidentRepository.getCommandKpis();
}

// ── Staff operations ───────────────────────────────────────

function getStaffProfile(user) {
  const db = require('../../database/connection');
  const profile = db.prepare(
    `SELECT sp.*, d.id AS department_id, d.name AS department_name
     FROM staff_profiles sp
     LEFT JOIN departments d ON d.id = sp.department_id
     WHERE sp.user_id = ?`
  ).get(user.id);
  if (!profile) throw ApiError.forbidden('No staff profile found');
  return profile;
}

function getStaffAssignments(user, query) {
  const profile = getStaffProfile(user);
  return incidentRepository.listByStaff({
    staffId: user.id,
    departmentId: profile.department_id,
    status: query.status
  });
}

function getStaffAssignmentDetail(user, incidentId) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  return {
    ...incident,
    contact_phone: incident.contact_phone,
    reporter_name: incident.reporter_name,
    media: incidentRepository.getMedia(incidentId),
    history: incidentRepository.getHistory(incidentId),
    situation_logs: incidentRepository.getSituationLogs(incidentId),
    ai_analysis: incidentRepository.getAiAnalysis(incidentId)
  };
}

function acceptAssignment(user, incidentId) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  if (incident.status !== 'ASSIGNED') {
    throw ApiError.badRequest('Incident must be in ASSIGNED status to accept');
  }
  return updateStatus(user, incidentId, 'ACCEPTED', 'Assignment accepted by responder');
}

function staffUpdateStatus(user, incidentId, status, notes) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  const allowed = { EN_ROUTE: ['ACCEPTED'], ON_SCENE: ['EN_ROUTE', 'ACCEPTED'] };
  if (!(allowed[status] || []).includes(incident.status)) {
    throw ApiError.badRequest(`Cannot transition from ${incident.status} to ${status}`);
  }
  return updateStatus(user, incidentId, status, notes);
}

function addSituationLog(user, incidentId, note, file) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  const activeStatuses = ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'RESOLUTION_SUBMITTED'];
  if (!activeStatuses.includes(incident.status)) {
    throw ApiError.badRequest('Can only add situation logs during active assignment');
  }
  let imageUrl = null;
  if (file) {
    imageUrl = `/uploads/incidents/${file.filename}`;
    incidentRepository.addMedia({
      id: crypto.randomUUID(),
      incidentId,
      fileUrl: imageUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      kind: 'SITUATION'
    });
  }
  const log = {
    id: crypto.randomUUID(),
    incidentId,
    staffId: user.id,
    note,
    imageUrl
  };
  incidentRepository.addSituationLog(log);
  return log;
}

function submitResolution(user, incidentId, data, file) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  if (incident.status !== 'ON_SCENE') {
    throw ApiError.badRequest('Must be ON_SCENE to submit resolution');
  }
  let proofUrl = null;
  if (file) {
    proofUrl = `/uploads/incidents/${file.filename}`;
    incidentRepository.addMedia({
      id: crypto.randomUUID(),
      incidentId,
      fileUrl: proofUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      kind: 'RESOLUTION'
    });
  }
  db.transaction(() => {
    incidentRepository.submitResolution(incidentId, {
      notes: data.resolutionNotes,
      proofUrl,
      resourcesUsed: data.resourcesUsed,
      followUpRequired: data.followUpRequired,
      resolvedBy: user.id
    });
    incidentRepository.addHistory({
      id: crypto.randomUUID(),
      incidentId,
      previousStatus: 'ON_SCENE',
      newStatus: 'RESOLUTION_SUBMITTED',
      changedBy: user.id,
      notes: 'Resolution submitted by responder — awaiting admin review'
    });
  })();
  return incidentRepository.findById(incidentId);
}

function getStaffKpis(user) {
  const profile = getStaffProfile(user);
  return incidentRepository.getStaffKpis(user.id, profile.department_id);
}

function getStaffHistory(user) {
  const profile = getStaffProfile(user);
  return incidentRepository.getStaffHistory(user.id, profile.department_id);
}

function toggleDutyStatus(user, status) {
  incidentRepository.updateDutyStatus(user.id, status);
  const db2 = require('../../database/connection');
  return db2.prepare(
    `SELECT sp.*, d.name AS department_name FROM staff_profiles sp
     LEFT JOIN departments d ON d.id = sp.department_id
     WHERE sp.user_id = ?`
  ).get(user.id);
}

// ── Resolution review ─────────────────────────────────────

function listResolutions() {
  return incidentRepository.listResolutions();
}

function getResolutionDetail(incidentId) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  return {
    ...incident,
    media: incidentRepository.getMedia(incidentId),
    history: incidentRepository.getHistory(incidentId),
    situation_logs: incidentRepository.getSituationLogs(incidentId),
    ai_analysis: incidentRepository.getAiAnalysis(incidentId)
  };
}

function approveResolution(user, incidentId, notes) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  if (incident.status !== 'RESOLUTION_SUBMITTED') {
    throw ApiError.badRequest('Incident must have a submitted resolution');
  }
  incidentRepository.approveResolution(incidentId, notes, user.id);
  return incidentRepository.findById(incidentId);
}

function rejectResolution(user, incidentId, notes) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  if (incident.status !== 'RESOLUTION_SUBMITTED') {
    throw ApiError.badRequest('Incident must have a submitted resolution');
  }
  incidentRepository.rejectResolution(incidentId, notes, user.id);
  return incidentRepository.findById(incidentId);
}

function reopenIncident(user, incidentId, notes) {
  const incident = incidentRepository.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  if (incident.status !== 'RESOLVED') {
    throw ApiError.badRequest('Only resolved incidents can be reopened');
  }
  incidentRepository.reopenIncident(incidentId, notes, user.id);
  return incidentRepository.findById(incidentId);
}

// ── Map data (Sprint 8) ───────────────────────────────────

function getMapIncidents(query) {
  const activeOnly = query.all !== 'true';
  return incidentRepository.getMapIncidents({ activeOnly });
}

function getMapResponders() {
  return incidentRepository.getMapResponders();
}
