/**
 * AI verification pipeline controller — exposes the real-time multi-agent
 * verification trace to citizens (own reports) and the live pipeline feed
 * to command staff.
 */
const aiPipelineService = require('../services/aiPipeline.service');
const aiTriageService = require('../services/aiTriage.service');
const db = require('../../database/connection');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/v1/incidents/:id/verification — pipeline trace for one incident */
async function incidentVerification(req, res) {
  const incident = db.prepare('SELECT id, reported_by FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found');

  // Citizens may only see the verification trace of their own reports
  if (req.user.role === 'PUBLIC' && incident.reported_by !== req.user.id) {
    throw ApiError.forbidden('You do not have access to this incident');
  }

  const verification = aiPipelineService.getVerification(req.params.id);
  if (!verification) {
    return res.json({
      success: true,
      message: 'Verification pending — pipeline still running',
      data: null
    });
  }

  res.json({ success: true, message: 'AI verification trace', data: verification });
}

/** GET /api/v1/admin/verification-feed — live pipeline runs + aggregate stats */
async function verificationFeed(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const data = aiPipelineService.getVerificationFeed({ limit });
  res.json({ success: true, message: 'AI verification feed', data });
}

/** POST /api/v1/ai/extract — smart report extraction (EN / Roman Urdu / Urdu) */
async function aiExtract(req, res) {
  const text = String(req.body?.text || '').trim();
  if (text.length < 5) throw ApiError.badRequest('Provide at least a few words to analyse');

  const extraction = aiTriageService.extractReport(text);
  res.json({ success: true, message: 'AI extraction complete', data: extraction });
}

/** GET /api/v1/admin/forecast — emergency forecasting hotspots */
async function forecast(req, res) {
  const days = Math.min(parseInt(req.query.days, 10) || 90, 365);
  const hotspots = aiPipelineService.computeForecastHotspots({ days });
  res.json({
    success: true,
    message: 'Emergency forecast computed from historical reports',
    data: { hotspots, windowDays: days }
  });
}

/** POST /api/v1/admin/incidents/:id/approve-dispatch — human approval gate */
async function approveDispatch(req, res) {
  const updated = aiPipelineService.approveDispatch(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Dispatch approved — citizen notified with live ETA',
    data: updated
  });
}

module.exports = {
  incidentVerification: asyncHandler(incidentVerification),
  verificationFeed: asyncHandler(verificationFeed),
  aiExtract: asyncHandler(aiExtract),
  forecast: asyncHandler(forecast),
  approveDispatch: asyncHandler(approveDispatch)
};
