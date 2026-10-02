const { DatabaseSync, backup } = require('node:sqlite');
const { mkdirSync, existsSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

async function backupDatabase(sourcePath, destinationPath) {
  if (!sourcePath) throw new Error('DB_PATH_REQUIRED');
  if (!destinationPath) throw new Error('BACKUP_PATH_REQUIRED');
  const source = resolve(sourcePath);
  const destination = resolve(destinationPath);
  if (source === destination) throw new Error('BACKUP_PATH_MUST_DIFFER_FROM_DB_PATH');
  if (!existsSync(source)) throw new Error('DATABASE_NOT_FOUND');
  mkdirSync(dirname(destination), { recursive: true });
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    db.exec('PRAGMA query_only=ON');
    const result = await backup(db, destination);
    const check = new DatabaseSync(destination, { readOnly: true });
    try {
      const integrity = check.prepare('PRAGMA integrity_check').get();
      if (!integrity || String(integrity.integrity_check).toLowerCase() !== 'ok') throw new Error('BACKUP_INTEGRITY_CHECK_FAILED');
    } finally { check.close(); }
    return { source, destination, pages: result };
  } finally { db.close(); }
}

async function main() {
  const source = process.env.DB_PATH || './data/ride2view.sqlite';
  const destination = process.argv[2] || process.env.BACKUP_PATH;
  const result = await backupDatabase(source, destination);
  console.log(JSON.stringify({ status: 'ok', ...result }));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { backupDatabase };
