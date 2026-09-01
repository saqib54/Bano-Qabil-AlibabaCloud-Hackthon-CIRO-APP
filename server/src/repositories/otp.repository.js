const db = require('../../database/connection');

const otpRepository = {
  create({ id, email, codeHash, expiresAt }) {
    db.prepare(`
      INSERT INTO otp_codes (id, email, code_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(id, email, codeHash, expiresAt);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM otp_codes WHERE id = ?').get(id);
  },

  findLatest(email) {
    return db.prepare(
      'SELECT * FROM otp_codes WHERE email = ? ORDER BY created_at DESC, rowid DESC LIMIT 1'
    ).get(email);
  },

  incrementAttempts(id) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(id);
  },

  markVerified(id) {
    db.prepare('UPDATE otp_codes SET verified = 1 WHERE id = ?').run(id);
  }
};

module.exports = otpRepository;
