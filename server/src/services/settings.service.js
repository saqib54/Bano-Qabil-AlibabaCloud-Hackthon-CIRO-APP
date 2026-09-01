const db = require('../../database/connection');
const auditRepository = require('../repositories/audit.repository');

const settingsService = {
  listAll() {
    return db.prepare('SELECT key, value, updated_at FROM system_settings ORDER BY key').all();
  },

  get(key) {
    return db.prepare('SELECT key, value, updated_at FROM system_settings WHERE key = ?').get(key);
  },

  update(actorId, key, value) {
    const existing = this.get(key);
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(key, value);

    auditRepository.log({
      actorId, action: 'SETTINGS_UPDATE', entity: 'system_settings', entityId: key,
      previousValue: existing?.value || null, newValue: value
    });

    return this.get(key);
  },

  upsert(actorId, settings) {
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      results.push(this.update(actorId, key, String(value)));
    }
    return results;
  }
};

module.exports = settingsService;
