const crypto = require('crypto');
const db = require('../../database/connection');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const refreshTokenRepository = {
  create({ id, userId, token, expiresAt }) {
    db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, hashToken(token), expiresAt);
  },

  findValid(token) {
    const row = db.prepare(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')`
    ).get(hashToken(token));
    return row;
  },

  revoke(id) {
    db.prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE id = ?`).run(id);
  },

  revokeAllForUser(userId) {
    db.prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`).run(userId);
  }
};

module.exports = refreshTokenRepository;
