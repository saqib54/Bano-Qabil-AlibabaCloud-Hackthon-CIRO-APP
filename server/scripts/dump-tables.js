const db = require('better-sqlite3')('./database/ciro.sqlite');
const fs = require('fs');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name).join(', '));
console.log('--- migrations ---');
console.log(fs.readdirSync('./database/migrations').join('\n'));
for (const t of ['incidents', 'incident_verification', 'forecast_hotspots', 'users']) {
  console.log(`--- ${t} ---`);
  console.log(db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name).join(', '));
}
