const {createHash}=require('node:crypto');
const {installSupplySchema}=require('../property/schema');
const {installJourneySchema}=require('../journeys/schema');
const {installMobilitySchema}=require('../mobility/onboarding/schema');
const {installPropertyServicesSchema}=require('../property-services/schema');
const {installOperationsSchema}=require('../operations/schema');
const {installMarketplaceSchema}=require('../marketplace/schema');
const {installGrowthSchema}=require('../growth/schema');
const {installMarketplaceExpansionSchema}=require('../marketplace-expansion/schema');
const {installAgentWorkflowSchema}=require('../agents/schema');
const {installAnalyticsSchema}=require('../analytics/schema');
const {installMemorySchema}=require('../memory/schema');
const {installIntelligenceSchema}=require('../intelligence/schema');
const CURRENT_SCHEMA_VERSION=25;
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
function governProviderCallbackRetries(db){if(!tableExists(db,'provider_callback_inbox'))return;const c=columns(db,'provider_callback_inbox');if(!c.has('next_attempt_at'))db.exec('ALTER TABLE provider_callback_inbox ADD COLUMN next_attempt_at TEXT');db.exec("UPDATE provider_callback_inbox SET next_attempt_at=COALESCE(next_attempt_at,received_at) WHERE status IN ('RECEIVED','FAILED')");db.exec('CREATE INDEX IF NOT EXISTS provider_callback_inbox_due ON provider_callback_inbox(status,next_attempt_at,lease_expires_at)');}
function addProviderCallbackLeaseVersion(db){if(!tableExists(db,'provider_callback_inbox'))return;const c=columns(db,'provider_callback_inbox');if(!c.has('lease_version'))db.exec('ALTER TABLE provider_callback_inbox ADD COLUMN lease_version INTEGER NOT NULL DEFAULT 0');}
function addPaymentInitiationLeaseVersion(db){if(!tableExists(db,'payment_initiation_outbox'))return;const c=columns(db,'payment_initiation_outbox');if(!c.has('lease_version'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN lease_version INTEGER NOT NULL DEFAULT 0');}
function addPaymentInitiationAmbiguity(db){if(!tableExists(db,'payment_initiation_outbox'))return;const c=columns(db,'payment_initiation_outbox');if(!c.has('acceptance_ambiguous'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN acceptance_ambiguous INTEGER NOT NULL DEFAULT 0');}
function addPaymentInitiationTotalAttempts(db){if(!tableExists(db,'payment_initiation_outbox'))return;const c=columns(db,'payment_initiation_outbox');if(!c.has('total_attempts'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN total_attempts INTEGER NOT NULL DEFAULT 0');db.exec('UPDATE payment_initiation_outbox SET total_attempts=attempts WHERE total_attempts=0 AND attempts>0');}
function addPaymentSideEffectOutbox(db){db.exec(`CREATE TABLE IF NOT EXISTS payment_side_effect_outbox(
 id TEXT PRIMARY KEY,event_key TEXT NOT NULL UNIQUE,effect_type TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,next_attempt_at TEXT,lease_owner TEXT,lease_expires_at TEXT,
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);CREATE INDEX IF NOT EXISTS payment_side_effect_outbox_due ON payment_side_effect_outbox(status,next_attempt_at,lease_expires_at);`);}
function addSupportRecoverySchema(db){db.exec(`CREATE TABLE IF NOT EXISTS support_cases(
 id TEXT PRIMARY KEY,customer_id TEXT,journey_id TEXT,incident_type TEXT NOT NULL,severity TEXT NOT NULL,
 affected_entity TEXT,correlation_id TEXT,status TEXT NOT NULL,idempotency_key TEXT NOT NULL UNIQUE,
 version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);CREATE TABLE IF NOT EXISTS support_case_events(
 id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES support_cases(id),event_type TEXT NOT NULL,
 evidence_ref TEXT,actor_id TEXT,created_at TEXT NOT NULL
);CREATE TABLE IF NOT EXISTS support_recovery_actions(
 id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES support_cases(id),domain TEXT NOT NULL,action TEXT NOT NULL,
 authority_entity_id TEXT NOT NULL,evidence_ref TEXT NOT NULL,created_at TEXT NOT NULL
);CREATE INDEX IF NOT EXISTS support_customer ON support_cases(customer_id);
CREATE INDEX IF NOT EXISTS support_journey ON support_cases(journey_id);
CREATE INDEX IF NOT EXISTS support_correlation ON support_cases(correlation_id);
CREATE INDEX IF NOT EXISTS support_case_events_case ON support_case_events(case_id);`);}
function addProviderRejectionEvidence(db){if(!tableExists(db,'payment_initiation_outbox'))return;const c=columns(db,'payment_initiation_outbox');if(!c.has('provider_rejection_code'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN provider_rejection_code TEXT');if(!c.has('provider_rejection_reason'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN provider_rejection_reason TEXT');if(!c.has('provider_rejected_at'))db.exec('ALTER TABLE payment_initiation_outbox ADD COLUMN provider_rejected_at TEXT');}
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
 {version:6,name:'payment-side-effect-outbox',definition:'v6:add durable leased outbox for post-commit payment side effects',up:addPaymentSideEffectOutbox},
 {version:7,name:'provider-callback-retry-governance',definition:'v7:add next_attempt_at and due index for bounded provider callback retries',up:governProviderCallbackRetries},
 {version:8,name:'provider-callback-lease-generation',definition:'v8:add monotonic lease_version fencing token to provider callback inbox',up:addProviderCallbackLeaseVersion},
 {version:9,name:'support-recovery-schema',definition:'v9:version support cases, evidence events and recovery actions required by payment callback recovery',up:addSupportRecoverySchema},
 {version:10,name:'payment-initiation-lease-generation',definition:'v10:add monotonic lease_version fencing token to payment initiation outbox',up:addPaymentInitiationLeaseVersion},
 {version:11,name:'payment-initiation-acceptance-ambiguity',definition:'v11:add explicit provider acceptance ambiguity state to payment initiation outbox',up:addPaymentInitiationAmbiguity},
 {version:12,name:'payment-initiation-lifetime-attempts',definition:'v12:add cumulative total_attempts to preserve initiation retry history across manual recovery',up:addPaymentInitiationTotalAttempts},
 {version:13,name:'provider-initiation-rejection-evidence',definition:'v13:add bounded provider rejection code reason and timestamp to payment initiation outbox',up:addProviderRejectionEvidence},
 {version:14,name:'agent-verified-property-supply',definition:'v14:private evidence, separate verification checks, property media slots, viewing requests leads outcomes customer profiles; quarantine legacy publication flags',up:installSupplySchema},
 {version:15,name:'customer-viewing-packages',definition:'v15:customer detail history, immutable package pricing versions, itinerary stops events credits refunds',up:installJourneySchema},
 {version:16,name:'verified-mobility-and-ride2go',definition:'v16:private driver and rider evidence reviews, driver profile and online supply, standalone ride trips pricing payments shared dispatch refunds; quarantine legacy driver flags',up:installMobilitySchema},
 {version:17,name:'remote-viewing-due-diligence',definition:'v17:private property service cases evidence events manual payments provider configuration and customer-authorized negotiation',up:installPropertyServicesSchema},
 {version:18,name:'provider-operations-and-live-transport',definition:'v18:durable gateway jobs collections signed evidence verified communications receipts fiscal snapshots and scoped live tracking',up:installOperationsSchema},
 {version:19,name:'marketplace-financial-backbone',definition:'v19:relationship attribution driver and agent earnings payout evidence and customer subscriptions',up:installMarketplaceSchema},
 {version:20,name:'marketplace-growth-retention',definition:'v20:student pools subscription consumption reputation safety incidents and remote tour summaries',up:installGrowthSchema},
 {version:21,name:'rideplate-marketplace-expansion',definition:'v21:merchant catalogs multishop checkout parcel policies courier custody proof and settlement bindings',up:installMarketplaceExpansionSchema},
 {version:22,name:'persistent-agent-workflows',definition:'v22:account-scoped advisory journeys fenced leases payload-bound idempotency review events and expiry',up:installAgentWorkflowSchema},
 {version:23,name:'measured-discovery-analytics',definition:'v23:minimal signed-in search and selection events with explicit collection start',up:installAnalyticsSchema},
 {version:24,name:'explicit-account-agent-memory',definition:'v24:opt-in versioned memory settings and bounded expiring source-linked explicit feedback and property exclusions',up:installMemorySchema},
 {version:25,name:'security-signal-collection',definition:'v25:aggregate minute security failure counters with collection start metadata and no personal identifiers',up:installIntelligenceSchema}
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
