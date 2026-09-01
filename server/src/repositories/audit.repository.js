const crypto = require('crypto');
const db = require('../../database/connection');

const auditRepository = {
  log({ actorId, action, entity, entityId, previousValue, newValue, meta }) {
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, previous_value, new_value, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      actorId || null,
      action,
      entity || null,
      entityId || null,
      previousValue != null ? String(previousValue) : null,
      newValue != null ? String(newValue) : null,
      meta != null ? JSON.stringify(meta) : null
    );
  },

  list({ limit = 50, offset = 0, entity, action } = {}) {
    let where = '1=1';
    const params = [];
    if (entity) { where += ' AND a.entity = ?'; params.push(entity); }
    if (action) { where += ' AND a.action = ?'; params.push(action); }
    const rows = db.prepare(`
      SELECT a.*, u.full_name AS actor_name, u.email AS actor_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_id
      WHERE ${where}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const countRow = db.prepare(`SELECT COUNT(*) AS total FROM audit_logs a WHERE ${where}`).get(...params);
    return { rows, total: countRow.total };
  }
};

module.exports = auditRepository;
