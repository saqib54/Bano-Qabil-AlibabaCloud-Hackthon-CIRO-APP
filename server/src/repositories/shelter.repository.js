/**
 * Shelter & safe-places repository — Sprint 8
 */
const db = require('../../database/connection');
const crypto = require('crypto');

const shelterRepository = {
  listAll({ activeOnly = true } = {}) {
    const where = activeOnly ? 'WHERE is_active = 1' : '';
    return db.prepare(
      `SELECT * FROM shelters ${where} ORDER BY name`
    ).all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM shelters WHERE id = ?').get(id);
  },

  create({ name, type, address, latitude, longitude, capacity, contact }) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO shelters (id, name, type, address, latitude, longitude, capacity, contact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type || 'SHELTER', address || null, latitude, longitude, capacity || null, contact || null);
    return this.findById(id);
  },

  update(id, fields) {
    const sets = [];
    const params = [];
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }
    if (sets.length === 0) return this.findById(id);
    sets.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE shelters SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  toggle(id) {
    const shelter = this.findById(id);
    if (!shelter) return null;
    const newState = shelter.is_active ? 0 : 1;
    db.prepare("UPDATE shelters SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(newState, id);
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM shelters WHERE id = ?').run(id);
  }
};

module.exports = shelterRepository;
