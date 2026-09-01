/**
 * Boot-time database bootstrap:
 *  1. Apply all pending migrations (idempotent).
 *  2. On a completely fresh database (e.g. an ephemeral cloud filesystem),
 *     seed the demo data so every feature is demoable immediately.
 * Existing databases are NEVER re-seeded.
 */
const db = require('./connection');
const migrate = require('./migrate');

function bootstrap() {
  migrate();

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (count === 0) {
    const { seed } = require('./seeds/seed');
    seed();
    console.log('[bootstrap] fresh database detected — demo data seeded');
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = bootstrap;
