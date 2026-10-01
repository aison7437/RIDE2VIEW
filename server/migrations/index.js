const CURRENT_SCHEMA_VERSION=1;
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
const migrations=[{version:1,name:'versioned-commerce-price-confirmations',up:migrateLegacyPriceConfirmations}];
function runMigrations(db){
 db.exec("CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL)");
 const applied=new Map(db.prepare('SELECT version,name FROM schema_migrations ORDER BY version').all().map(x=>[x.version,x.name]));
 const unknown=[...applied.keys()].filter(v=>v>CURRENT_SCHEMA_VERSION);
 if(unknown.length)throw Object.assign(new Error('DATABASE_SCHEMA_NEWER_THAN_APPLICATION'),{code:'DATABASE_SCHEMA_NEWER_THAN_APPLICATION',databaseVersion:Math.max(...unknown),applicationVersion:CURRENT_SCHEMA_VERSION});
 for(const m of migrations){
  if(applied.has(m.version)){if(applied.get(m.version)!==m.name)throw Object.assign(new Error('DATABASE_MIGRATION_IDENTITY_MISMATCH'),{code:'DATABASE_MIGRATION_IDENTITY_MISMATCH',version:m.version});continue;}
  db.exec('BEGIN IMMEDIATE');
  try{m.up(db);db.prepare('INSERT INTO schema_migrations(version,name,applied_at) VALUES(?,?,?)').run(m.version,m.name,new Date().toISOString());db.exec('COMMIT');}
  catch(e){db.exec('ROLLBACK');throw e;}
 }
 return CURRENT_SCHEMA_VERSION;
}
module.exports={CURRENT_SCHEMA_VERSION,runMigrations};
