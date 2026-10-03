function installPropertyServicesSchema(db) {
 db.exec(`
 CREATE TABLE property_service_cases(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),agent_id TEXT NOT NULL REFERENCES users(id),listing_id TEXT NOT NULL REFERENCES listings(id),kind TEXT NOT NULL CHECK(kind IN ('remote','diligence')),status TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,data TEXT NOT NULL,idempotency_key TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(customer_id,idempotency_key));
 CREATE TABLE property_service_events(id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES property_service_cases(id),actor_id TEXT REFERENCES users(id),event TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE property_service_documents(id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES property_service_cases(id),owner_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,mime TEXT NOT NULL,content BLOB NOT NULL,sha256 TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE property_service_payments(case_id TEXT PRIMARY KEY REFERENCES property_service_cases(id),amount INTEGER NOT NULL CHECK(amount>0),status TEXT NOT NULL,reference TEXT UNIQUE,refund_reference TEXT UNIQUE,verified_by TEXT REFERENCES users(id),updated_at TEXT NOT NULL);
 CREATE TABLE property_service_config(version INTEGER PRIMARY KEY,data TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
 CREATE INDEX property_service_customer ON property_service_cases(customer_id,created_at);
 CREATE INDEX property_service_agent ON property_service_cases(agent_id,status);
 `);
}
module.exports={installPropertyServicesSchema};
