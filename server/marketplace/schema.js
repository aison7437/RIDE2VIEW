function installMarketplaceSchema(db){
 db.exec(`
 CREATE TABLE marketplace_relationships(
  id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),agent_id TEXT NOT NULL REFERENCES users(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),source_kind TEXT NOT NULL,source_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
  UNIQUE(customer_id,agent_id,listing_id),CHECK(status IN ('ACTIVE','WON','LOST','CLOSED'))
 );
 CREATE TABLE marketplace_earnings(
  id TEXT PRIMARY KEY,beneficiary_id TEXT NOT NULL REFERENCES users(id),beneficiary_role TEXT NOT NULL,
  source_kind TEXT NOT NULL,source_id TEXT NOT NULL,gross_amount INTEGER NOT NULL CHECK(gross_amount>=0),
  platform_amount INTEGER NOT NULL CHECK(platform_amount>=0),beneficiary_amount INTEGER NOT NULL CHECK(beneficiary_amount>=0),
  currency TEXT NOT NULL DEFAULT 'KES',status TEXT NOT NULL DEFAULT 'EARNED',evidence_ref TEXT NOT NULL,
  payout_reference TEXT UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
  UNIQUE(beneficiary_id,source_kind,source_id),
  CHECK(gross_amount=platform_amount+beneficiary_amount),
  CHECK(status IN ('EARNED','PAYOUT_PENDING','PAID','DISPUTED','VOID'))
 );
 CREATE TABLE subscription_plans(
  id TEXT PRIMARY KEY,name TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),currency TEXT NOT NULL DEFAULT 'KES',
  duration_days INTEGER NOT NULL CHECK(duration_days>0),viewing_credits INTEGER NOT NULL CHECK(viewing_credits>=0),
  active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL
 );
 CREATE TABLE customer_subscriptions(
  id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,remaining_viewings INTEGER NOT NULL CHECK(remaining_viewings>=0),
  payment_reference TEXT UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
  CHECK(status IN ('PENDING','ACTIVE','EXPIRED','CANCELLED'))
 );
 CREATE INDEX marketplace_relationship_customer ON marketplace_relationships(customer_id,status);
 CREATE INDEX marketplace_relationship_agent ON marketplace_relationships(agent_id,status);
 CREATE INDEX marketplace_earnings_beneficiary ON marketplace_earnings(beneficiary_id,status,created_at);
 CREATE INDEX customer_subscription_status ON customer_subscriptions(customer_id,status,ends_at);
 `);
}
module.exports={installMarketplaceSchema};
