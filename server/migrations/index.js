const {createHash}=require('node:crypto');
const CURRENT_SCHEMA_VERSION=6;
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
function hardenPaymentOutbox(db){if(!tableExists(db,'payment_initiation_outbox'))return;const c=columns(db,'payment_initiation_outbox');if(!c.has('next_attempt_at'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN next_attempt_at TEXT');if(!c.has('lease_owner'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN lease_owner TEXT');if(!c.has('lease_expires_at'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN lease_expires_at TEXT');db.exec("UPDATE payment_initiation_outbox SET next_attempt_at=COALESCE(next_attempt_at,created_at) WHERE status IN ('PENDING','FAILED')");db.exec('CREATE INDEX IF NOT EXISTS payment_initiation_outbox_due ON payment_initiation_outbox(status,next_attempt_at,lease_expires_at)');}
function addProviderInitiationEvidence(db){if(!tableExists(db,'payment_initiation_outbox'))return;const c=columns(db,'payment_initiation_outbox');if(!c.has('provider_acknowledgement'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN provider_acknowledgement TEXT');if(!c.has('provider_acknowledged_at'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN provider_acknowledged_at TEXT');}
function hardenProviderCallbackInbox(db){if(!tableExists(db,'provider_callback_inbox'))return;const c=columns(db,'provider_callback_inbox');if(!c.has('lease_owner'))db.exec('ALTER TABLE provider_callback_inbox ADD COLUMN lease_owner TEXT');if(!c.has('lease_expires_at'))db.exec('ALTER TABLE provider_callback_inbox ADD COLUMN lease_expires_at TEXT');db.exec('CREATE INDEX IF NOT EXISTS provider_callback_inbox_lease ON provider_callback_inbox(status,lease_expires_at)');}
function addPaymentSideEffectOutbox(db){db.exec(`CREATE TABLE IF NOT EXISTS payment_side_effect_outbox(
 id TEXT PRIMARY KEY,event_key TEXT NOT NULL UNIQUE,effect_type TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,next_attempt_at TEXT,lease_owner TEXT,lease_expires_at TEXT,
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);CREATE INDEX IF NOT EXISTS payment_side_effect_outbox_due ON payment_side_effect_outbox(status,next_attempt_at,lease_expires_at);`);}
function addMigrationIntegrity(db){
 const c=columns(db,'schema_migrations');
 if(!c.has('checksum'))db.exec('ALTER TABLE schema_migrations ADD COLUMN checksum TEXT');
}
const migrations=[
 {version:1,name:'versioned-commerce-price-confirmations',definition:'v1:rebuild commerce_price_confirmations with status,supersedes,customer acknowledgement and active uniqueness',up:migrateLegacyPriceConfirmations},
 {version:2,name:'migration-integrity-checksums',definition:'v2:add checksum to schema_migrations and backfill registry checksums',up:addMigrationIntegrity},
 {version:3,name:'payment-initiation-outbox-runtime',definition:'v3:add next_attempt_at,lease_owner,lease_expires_at and due index to payment initiation outbox',up:hardenPaymentOutbox},
 {version:4,name:'provider-initiation-evidence',definition:'v4:add durable provider acknowledgement evidence fields to payment initiation outbox',up:addProviderInitiationEvidence},
 {version:5,name:'provider-callback-worker-leases',definition:'v5:add lease_owner,lease_expires_at and lease index to provider callback inbox',up:hardenProviderCallbackInbox},
 {version:6,name:'payment-side-effect-outbox',definition:'v6:add durable leased outbox for post-commit payment side effects',up:addPaymentSideEffectOutbox}
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
