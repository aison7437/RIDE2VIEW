const { DatabaseSync } = require('node:sqlite');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

function checkDatabase(path) {
  if (!path) throw new Error('DB_PATH_REQUIRED');
  const databasePath = resolve(path);
  if (!existsSync(databasePath)) throw new Error('DATABASE_NOT_FOUND');
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const integrity = db.prepare('PRAGMA integrity_check').get();
    const foreignKeys = db.prepare('PRAGMA foreign_key_check').all();
    const schema = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    const schemaVersion = schema ? Number(db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations').get().version) : null;
    const ok = String(integrity?.integrity_check).toLowerCase() === 'ok' && foreignKeys.length === 0;
    return { ok, databasePath, integrity: integrity?.integrity_check || null, foreignKeyViolations: foreignKeys.length, schemaVersion };
  } finally { db.close(); }
}

if (require.main === module) {
  try {
    const result = checkDatabase(process.argv[2] || process.env.DB_PATH || './data/ride2view.sqlite');
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkDatabase };
