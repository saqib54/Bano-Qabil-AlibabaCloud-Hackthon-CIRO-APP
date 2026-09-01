/**
 * Smart Dispatch controller — Sprint 9
 */
const dispatchService = require('../services/dispatch.service');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/v1/admin/dispatch/recommendations */
async function recommendations(req, res) {
  const data = dispatchService.getDispatchRecommendations();
  res.json({ success: true, message: 'Dispatch recommendations', data });
}

/** POST /api/v1/admin/dispatch/auto-assign */
async function autoAssign(req, res) {
  const { incidentIds } = req.body;
  if (!Array.isArray(incidentIds) || incidentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'incidentIds array is required' });
  }
  const results = dispatchService.autoAssignBatch(incidentIds);
  const assigned = results.filter((r) => r.status === 'assigned').length;
  res.json({ success: true, message: `${assigned} incident(s) auto-assigned`, data: results });
}

module.exports = {
  recommendations: asyncHandler(recommendations),
  autoAssign: asyncHandler(autoAssign)
};
