const db = require('../../database/connection');

const userRepository = {
  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  create({ id, fullName, email, phone, passwordHash, role }) {
    db.prepare(`
      INSERT INTO users (id, full_name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, fullName, email, phone, passwordHash, role);
    return this.findById(id);
  },

  createWithProvider({ id, fullName, email, passwordHash, provider, providerSub, avatarUrl, role }) {
    db.prepare(`
      INSERT INTO users (id, full_name, email, password_hash, provider, provider_sub, avatar_url, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, fullName, email, passwordHash, provider, providerSub, avatarUrl, role);
    return this.findById(id);
  },

  linkProvider(id, { provider, providerSub, avatarUrl }) {
    db.prepare(`
      UPDATE users
      SET provider = ?, provider_sub = ?,
          avatar_url = COALESCE(?, avatar_url),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(provider, providerSub, avatarUrl, id);
    return this.findById(id);
  },

  updateLastLogin(id) {
    db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(id);
  },

  findStaffProfile(userId) {
    return db.prepare(
      `SELECT sp.*, d.name AS department_name, d.code AS department_code
       FROM staff_profiles sp
       LEFT JOIN departments d ON d.id = sp.department_id
       WHERE sp.user_id = ?`
    ).get(userId);
  },

  updatePrefs(id, prefs) {
    db.prepare(
      `UPDATE users SET prefs = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(prefs), id);
    return this.findById(id);
  },

  acceptTerms(id) {
    db.prepare(
      `UPDATE users SET terms_accepted_at = COALESCE(terms_accepted_at, datetime('now')),
       updated_at = datetime('now') WHERE id = ?`
    ).run(id);
    return this.findById(id);
  },

  updateProfile(id, { fullName, phone, avatarUrl }) {
    const fields = [];
    const values = [];
    if (fullName !== undefined) { fields.push('full_name = ?'); values.push(fullName); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(avatarUrl); }
    if (fields.length === 0) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  toSafeUser(user) {
    const { password_hash, ...safe } = user;
    let prefs = {};
    try {
      prefs = JSON.parse(safe.prefs || '{}');
    } catch {
      prefs = {};
    }
    return {
      ...safe,
      prefs,
      is_active: Boolean(safe.is_active)
    };
  }
};

module.exports = userRepository;
