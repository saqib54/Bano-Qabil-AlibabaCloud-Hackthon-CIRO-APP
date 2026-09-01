/**
 * Notification & broadcast repository — Sprint 7
 */
const db = require('../../database/connection');
const crypto = require('crypto');

const notificationRepository = {
  // ── Notifications ──────────────────────────────────────

  getNotifications(userId, { limit = 50 } = {}) {
    return db.prepare(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    ).all(userId, limit);
  },

  getUnreadCount(userId) {
    return db.prepare(
      `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0`
    ).get(userId).n;
  },

  markRead(notificationId, userId) {
    return db.prepare(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`
    ).run(notificationId, userId);
  },

  markAllRead(userId) {
    return db.prepare(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`
    ).run(userId);
  },

  createNotification({ userId, type, title, message, severity, relatedEntity, relatedId }) {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, severity, related_entity, related_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, userId, type || 'SYSTEM', title, message, severity || 'INFO', relatedEntity || null, relatedId || null);
    return id;
  },

  /** Bulk-create a notification for every user matching the audience. */
  broadcastToAudience({ audience, title, message, severity, broadcastId }) {
    const where = audience === 'ALL'
      ? `WHERE is_active = 1`
      : audience === 'PUBLIC'
        ? `WHERE role = 'PUBLIC' AND is_active = 1`
        : `WHERE role = 'STAFF' AND is_active = 1`;

    const users = db.prepare(`SELECT id FROM users ${where}`).all();
    const insert = db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, severity, related_entity, related_id)
       VALUES (?, ?, 'BROADCAST', ?, ?, ?, 'broadcast', ?)`
    );
    const batch = db.transaction(() => {
      for (const u of users) {
        insert.run(crypto.randomUUID(), u.id, title, message, severity || 'HIGH', broadcastId);
      }
    });
    batch();
    return users.length;
  },

  // ── Broadcasts ─────────────────────────────────────────

  getBroadcasts({ limit = 50 } = {}) {
    return db.prepare(
      `SELECT eb.*, u.full_name AS created_by_name
       FROM emergency_broadcasts eb
       LEFT JOIN users u ON u.id = eb.created_by
       ORDER BY eb.created_at DESC
       LIMIT ?`
    ).all(limit);
  },

  getActiveBroadcasts() {
    return db.prepare(
      `SELECT eb.*, u.full_name AS created_by_name
       FROM emergency_broadcasts eb
       LEFT JOIN users u ON u.id = eb.created_by
       WHERE eb.is_active = 1
       AND (eb.expires_at IS NULL OR eb.expires_at > datetime('now'))
       ORDER BY eb.created_at DESC`
    ).all();
  },

  createBroadcast({ title, message, severity, targetAudience, regions, createdBy, expiresAt, source, relatedIncidentId }) {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO emergency_broadcasts (id, title, message, severity, target_audience, regions, created_by, expires_at, source, related_incident_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, title, message, severity || 'HIGH', targetAudience || 'ALL', regions || null, createdBy || null, expiresAt || null, source || 'ADMIN', relatedIncidentId || null);
    return db.prepare('SELECT * FROM emergency_broadcasts WHERE id = ?').get(id);
  },

  deactivateBroadcast(broadcastId) {
    db.prepare(
      `UPDATE emergency_broadcasts SET is_active = 0 WHERE id = ?`
    ).run(broadcastId);
  }
};

module.exports = notificationRepository;
