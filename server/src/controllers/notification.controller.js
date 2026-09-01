/**
 * Notification & broadcast controller — Sprint 7
 */
const notificationService = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');

// ── User notifications (public + staff) ─────────────

/** GET /api/v1/notifications */
async function listNotifications(req, res) {
  const data = notificationService.getUserNotifications(req.user, req.query);
  res.json({ success: true, message: 'Your notifications', data });
}

/** PATCH /api/v1/notifications/:id/read */
async function markRead(req, res) {
  const data = notificationService.markNotificationRead(req.user, req.params.id);
  res.json({ success: true, message: 'Notification marked as read', data });
}

/** PATCH /api/v1/notifications/mark-all-read */
async function markAllRead(req, res) {
  const data = notificationService.markAllNotificationsRead(req.user);
  res.json({ success: true, message: 'All notifications marked as read', data });
}

// ── Public alerts (active broadcasts) ───────────────

/** GET /api/v1/alerts */
async function listAlerts(req, res) {
  const data = notificationService.getActiveBroadcasts();
  res.json({ success: true, message: 'Active emergency alerts', data });
}

// ── Admin broadcast management ──────────────────────

/** GET /api/v1/admin/broadcasts */
async function listBroadcasts(req, res) {
  const data = notificationService.getBroadcasts(req.query);
  res.json({ success: true, message: 'Emergency broadcasts', data });
}

/** POST /api/v1/admin/broadcasts */
async function createBroadcast(req, res) {
  const data = notificationService.createBroadcast(req.user, req.body);
  res.status(201).json({ success: true, message: `Broadcast sent to ${data.recipients} recipients`, data });
}

/** PATCH /api/v1/admin/broadcasts/:id/deactivate */
async function deactivateBroadcast(req, res) {
  const data = notificationService.deactivateBroadcast(req.params.id);
  res.json({ success: true, message: 'Broadcast deactivated', data });
}

module.exports = {
  // User-facing
  listNotifications: asyncHandler(listNotifications),
  markRead: asyncHandler(markRead),
  markAllRead: asyncHandler(markAllRead),
  listAlerts: asyncHandler(listAlerts),
  // Admin
  listBroadcasts: asyncHandler(listBroadcasts),
  createBroadcast: asyncHandler(createBroadcast),
  deactivateBroadcast: asyncHandler(deactivateBroadcast)
};
