/**
 * Notification & broadcast service — Sprint 7
 */
const notificationRepository = require('../repositories/notification.repository');
const ApiError = require('../utils/ApiError');

/**
 * Get notifications for the current user.
 */
function getUserNotifications(user, query = {}) {
  const limit = parseInt(query.limit, 10) || 50;
  const notifications = notificationRepository.getNotifications(user.id, { limit });
  const unreadCount = notificationRepository.getUnreadCount(user.id);
  return { notifications, unreadCount };
}

/**
 * Mark a single notification as read.
 */
function markNotificationRead(user, notificationId) {
  const result = notificationRepository.markRead(notificationId, user.id);
  if (result.changes === 0) throw ApiError.notFound('Notification not found');
  return { id: notificationId, is_read: true };
}

/**
 * Mark all notifications as read for the current user.
 */
function markAllNotificationsRead(user) {
  const result = notificationRepository.markAllRead(user.id);
  return { marked: result.changes };
}

/**
 * Send a single notification to a specific user.
 * Used internally by other services (e.g., when incident status changes).
 */
function sendNotification(userId, { type, title, message, severity, relatedEntity, relatedId }) {
  return notificationRepository.createNotification({
    userId, type, title, message, severity, relatedEntity, relatedId
  });
}

/**
 * Create an emergency broadcast (admin- or AI-pipeline-initiated).
 * Creates the broadcast record, fans out notifications to the target audience,
 * and pushes a real-time `alert.new` event over WebSocket so connected
 * citizens are aware within seconds.
 */
function createBroadcast(user, { title, message, severity, targetAudience, regions, expiresAt, source, relatedIncidentId }) {
  if (!title || !message) throw ApiError.badRequest('Title and message are required');

  const broadcast = notificationRepository.createBroadcast({
    title, message, severity, targetAudience, regions,
    createdBy: user?.id || null, expiresAt,
    source: source || 'ADMIN', relatedIncidentId
  });

  // Fan out notifications to all matching users
  const recipientCount = notificationRepository.broadcastToAudience({
    audience: targetAudience || 'ALL',
    title,
    message,
    severity: severity || 'HIGH',
    broadcastId: broadcast.id
  });

  // Real-time push — every connected user in the audience sees the alert instantly
  try {
    const { broadcastToRole, broadcastToAll } = require('../websocket');
    const event = {
      type: 'alert.new',
      alert: {
        id: broadcast.id,
        title,
        message,
        severity: severity || 'HIGH',
        source: broadcast.source,
        related_incident_id: relatedIncidentId || null,
        created_at: broadcast.created_at
      }
    };
    const audience = targetAudience || 'ALL';
    if (audience === 'PUBLIC') broadcastToRole('PUBLIC', event);
    else if (audience === 'STAFF') broadcastToRole('STAFF', event);
    else broadcastToAll(event);
  } catch (_err) {
    // WebSocket hub unavailable (e.g. during tests) — DB fan-out already succeeded
  }

  return { ...broadcast, recipients: recipientCount };
}

/**
 * Get all broadcasts (admin view).
 */
function getBroadcasts(query = {}) {
  const limit = parseInt(query.limit, 10) || 50;
  return notificationRepository.getBroadcasts({ limit });
}

/**
 * Get active broadcasts (public/staff view — only active, non-expired).
 */
function getActiveBroadcasts() {
  return notificationRepository.getActiveBroadcasts();
}

/**
 * Deactivate a broadcast (admin).
 */
function deactivateBroadcast(broadcastId) {
  notificationRepository.deactivateBroadcast(broadcastId);
  return { id: broadcastId, is_active: false };
}

module.exports = {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  sendNotification,
  createBroadcast,
  getBroadcasts,
  getActiveBroadcasts,
  deactivateBroadcast
};
