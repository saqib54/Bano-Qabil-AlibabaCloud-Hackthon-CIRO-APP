/**
 * Staff (Responder) operations controller — assignment acceptance,
 * status updates, situation logs, and resolution submission (Sprint 5).
 */
const incidentService = require('../services/incident.service');
const { uploadIncidentImage } = require('../services/storage.service');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/v1/staff/assignments */
async function assignments(req, res) {
  const data = incidentService.getStaffAssignments(req.user, req.query);
  res.json({ success: true, message: 'Your assignments', data });
}

/** GET /api/v1/staff/assignments/:id */
async function detail(req, res) {
  const data = incidentService.getStaffAssignmentDetail(req.user, req.params.id);
  res.json({ success: true, message: 'Assignment detail', data });
}

/** PATCH /api/v1/staff/assignments/:id/accept */
async function accept(req, res) {
  const incident = incidentService.acceptAssignment(req.user, req.params.id);
  res.json({ success: true, message: 'Assignment accepted', data: incident });
}

/** PATCH /api/v1/staff/assignments/:id/status */
async function updateStatus(req, res) {
  const incident = incidentService.staffUpdateStatus(
    req.user, req.params.id, req.body.status, req.body.notes
  );
  res.json({ success: true, message: 'Status updated', data: incident });
}

/** POST /api/v1/staff/assignments/:id/situation-log */
const parseUpload = (req, res, next) => {
  uploadIncidentImage(req, res, (err) => {
    if (err) {
      err.statusCode = err.statusCode || 500;
      return next(err);
    }
    next();
  });
};

async function addSituationLog(req, res) {
  const log = incidentService.addSituationLog(
    req.user, req.params.id, req.body.note, req.file
  );
  res.status(201).json({ success: true, message: 'Situation log added', data: log });
}

/** POST /api/v1/staff/assignments/:id/resolve */
async function submitResolution(req, res) {
  const incident = incidentService.submitResolution(
    req.user, req.params.id, req.body, req.file
  );
  res.json({ success: true, message: 'Resolution submitted — awaiting admin review', data: incident });
}

/** GET /api/v1/staff/kpi */
async function kpis(req, res) {
  const data = incidentService.getStaffKpis(req.user);
  res.json({ success: true, message: 'Staff KPIs', data });
}

/** GET /api/v1/staff/history */
async function history(req, res) {
  const data = incidentService.getStaffHistory(req.user);
  res.json({ success: true, message: 'Completed incidents', data });
}

/** PATCH /api/v1/staff/duty-status */
async function toggleDuty(req, res) {
  const profile = incidentService.toggleDutyStatus(req.user, req.body.dutyStatus);
  res.json({ success: true, message: `Duty status: ${req.body.dutyStatus}`, data: profile });
}

module.exports = {
  assignments: asyncHandler(assignments),
  detail: asyncHandler(detail),
  accept: asyncHandler(accept),
  updateStatus: asyncHandler(updateStatus),
  addSituationLog: [parseUpload, asyncHandler(addSituationLog)],
  submitResolution: [parseUpload, asyncHandler(submitResolution)],
  kpis: asyncHandler(kpis),
  history: asyncHandler(history),
  toggleDuty: asyncHandler(toggleDuty)
};
