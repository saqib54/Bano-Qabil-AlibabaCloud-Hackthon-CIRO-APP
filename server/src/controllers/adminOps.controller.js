const analyticsService = require('../services/analytics.service');
const settingsService = require('../services/settings.service');
const auditRepository = require('../repositories/audit.repository');
const asyncHandler = require('../utils/asyncHandler');

const analytics = asyncHandler(async (_req, res) => {
  const data = analyticsService.getOperationalAnalytics();
  res.json({ success: true, message: 'Analytics loaded', data });
});

const resources = asyncHandler(async (_req, res) => {
  const data = analyticsService.getResourceOverview();
  res.json({ success: true, message: 'Resource overview loaded', data });
});

const weather = asyncHandler(async (_req, res) => {
  const data = analyticsService.getWeatherData();
  res.json({ success: true, message: 'Weather data loaded', data });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const { limit, offset, entity, action } = req.query;
  const result = auditRepository.list({
    limit: limit ? parseInt(limit) : 50,
    offset: offset ? parseInt(offset) : 0,
    entity, action
  });
  res.json({ success: true, message: 'Audit logs loaded', data: result });
});

const listSettings = asyncHandler(async (_req, res) => {
  const settings = settingsService.listAll();
  res.json({ success: true, message: 'Settings loaded', data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = req.body.settings;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Settings object required', data: null });
  }
  const updated = settingsService.upsert(req.user.id, settings);
  res.json({ success: true, message: 'Settings updated', data: updated });
});

module.exports = { analytics, resources, weather, listAuditLogs, listSettings, updateSettings };
