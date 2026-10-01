const {createHash}=require('node:crypto');
const CURRENT_SCHEMA_VERSION=2;
function tableExists(db,name){return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);}
function columns(db,table){return new Set(db.prepare(`PRAGMA table_info("${String(table).replaceAll('"','""')}")`).all().map(x=>x.name));}
function migrateLegacyPriceConfirmations(db){
 if(!tableExists(db,'commerce_price_confirmations'))return;
 const c=columns(db,'commerce_price_confirmations');
 if(c.has('status')&&c.has('supersedes_id')&&c.has('customer_acknowledged_at')&&c.has('customer_acknowledged_by'))return;
 db.exec(`ALTER TABLE commerce_price_confirmations RENAME TO commerce_price_confirmations_legacy_v1;
 CREATE TABLE commerce_price_confirmations(
  id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES commerce_orders(id),merchant_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount>=0),currency TEXT NOT NULL,inventory_versions TEXT NOT NULL,
  confirmed_by TEXT,status TEXT NOT NULL DEFAULT 'ACTIVE',supersedes_id TEXT REFERENCES commerce_price_confirmations(id),
  customer_acknowledged_at TEXT,customer_acknowledged_by TEXT,created_at TEXT NOT NULL
 );
 INSERT INTO commerce_price_confirmations(id,order_id,merchant_id,amount,currency,inventory_versions,confirmed_by,status,created_at)
 SELECT id,order_id,merchant_id,amount,currency,inventory_versions,confirmed_by,'ACTIVE',created_at
 FROM commerce_price_confirmations_legacy_v1;
 DROP TABLE commerce_price_confirmations_legacy_v1;
 CREATE INDEX IF NOT EXISTS commerce_price_confirmation_order ON commerce_price_confirmations(order_id,created_at);
 CREATE UNIQUE INDEX IF NOT EXISTS commerce_price_confirmation_active ON commerce_price_confirmations(order_id) WHERE status='ACTIVE';`);
}
function addMigrationIntegrity(db){
 const c=columns(db,'schema_migrations');
 if(!c.has('checksum'))db.exec('ALTER TABLE schema_migrations ADD COLUMN checksum TEXT');
}
const migrations=[
 {version:1,name:'versioned-commerce-price-confirmations',definition:'v1:rebuild commerce_price_confirmations with status,supersedes,customer acknowledgement and active uniqueness',up:migrateLegacyPriceConfirmations},
 {version:2,name:'migration-integrity-checksums',definition:'v2:add checksum to schema_migrations and backfill registry checksums',up:addMigrationIntegrity}
];
function checksum(m){return createHash('sha256').update(`${m.version}:${m.name}:${m.definition}`).digest('hex');}
function ensureMetadata(db){db.exec("CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL,checksum TEXT)");}
function runMigrations(db){
 ensureMetadata(db);
 let cols=columns(db,'schema_migrations');
 const rows=db.prepare('SELECT * FROM schema_migrations ORDER BY version').all();
 const applied=new Map(rows.map(x=>[x.version,x]));
 const unknown=[...applied.keys()].filter(v=>v>CURRENT_SCHEMA_VERSION);
 if(unknown.length)throw Object.assign(new Error('DATABASE_SCHEMA_NEWER_THAN_APPLICATION'),{code:'DATABASE_SCHEMA_NEWER_THAN_APPLICATION',databaseVersion:Math.max(...unknown),applicationVersion:CURRENT_SCHEMA_VERSION});
 for(const m of migrations){
  const prior=applied.get(m.version);
  if(prior){
   if(prior.name!==m.name)throw Object.assign(new Error('DATABASE_MIGRATION_IDENTITY_MISMATCH'),{code:'DATABASE_MIGRATION_IDENTITY_MISMATCH',version:m.version});
   if(cols.has('checksum')&&prior.checksum&&prior.checksum!==checksum(m))throw Object.assign(new Error('DATABASE_MIGRATION_CHECKSUM_MISMATCH'),{code:'DATABASE_MIGRATION_CHECKSUM_MISMATCH',version:m.version});
   continue;
  }
  db.exec('BEGIN IMMEDIATE');
  try{
   m.up(db);cols=columns(db,'schema_migrations');
   if(cols.has('checksum'))db.prepare('INSERT INTO schema_migrations(version,name,applied_at,checksum) VALUES(?,?,?,?)').run(m.version,m.name,new Date().toISOString(),checksum(m));
   else db.prepare('INSERT INTO schema_migrations(version,name,applied_at) VALUES(?,?,?)').run(m.version,m.name,new Date().toISOString());
   if(m.version===2){for(const old of migrations.filter(x=>x.version<2)){db.prepare('UPDATE schema_migrations SET checksum=? WHERE version=? AND checksum IS NULL').run(checksum(old),old.version);}}
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 for(const m of migrations){const row=db.prepare('SELECT * FROM schema_migrations WHERE version=?').get(m.version);if(row?.checksum&&row.checksum!==checksum(m))throw Object.assign(new Error('DATABASE_MIGRATION_CHECKSUM_MISMATCH'),{code:'DATABASE_MIGRATION_CHECKSUM_MISMATCH',version:m.version});}
 return CURRENT_SCHEMA_VERSION;
}
module.exports={CURRENT_SCHEMA_VERSION,runMigrations,migrations,checksum};
