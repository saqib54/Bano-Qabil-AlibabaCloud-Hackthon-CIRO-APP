/**
 * Lightweight SQL migration runner.
 * Applies every .sql file in /migrations once (tracked in schema_migrations).
 */
const fs = require('fs');
const path = require('path');
const db = require('./connection');

const migrationsDir = path.join(__dirname, 'migrations');

function migrate() {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  const applied = new Set(
    db.prepare('SELECT id FROM schema_migrations').all().map((r) => r.id)
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const run = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(file);
    });
    run();
    console.log(`[migrate] applied ${file}`);
  }

  console.log('[migrate] done');
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
