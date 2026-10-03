function installOperationsSchema(db){db.exec(`
CREATE TABLE integration_jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,customer_id TEXT REFERENCES users(id),target_kind TEXT,target_id TEXT,event_key TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,lease_token TEXT,lease_until TEXT,result TEXT,last_error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX integration_jobs_due ON integration_jobs(status,created_at);
CREATE TABLE collection_requests(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,target_id TEXT NOT NULL,amount INTEGER NOT NULL,phone TEXT NOT NULL,idempotency_key TEXT NOT NULL,status TEXT NOT NULL,provider_request_id TEXT,reference TEXT,refund_reference TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(customer_id,idempotency_key));
CREATE UNIQUE INDEX collection_provider_request ON collection_requests(provider_request_id) WHERE provider_request_id IS NOT NULL;
CREATE UNIQUE INDEX collection_active ON collection_requests(kind,target_id) WHERE status IN ('QUEUED','WAITING','REVIEW','CONFIRMED');
CREATE TABLE operations_refunds(id TEXT PRIMARY KEY,kind TEXT NOT NULL,target_id TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL,reference TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(kind,target_id));
CREATE TABLE collection_events(id TEXT PRIMARY KEY,collection_id TEXT NOT NULL REFERENCES collection_requests(id),hash TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,error TEXT,created_at TEXT NOT NULL);
CREATE TABLE communication_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id),channel TEXT NOT NULL,destination TEXT NOT NULL,consent INTEGER NOT NULL,verified_at TEXT,code_hash TEXT,code_expires TEXT,attempts INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL);
CREATE TABLE customer_receipts(number INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,kind TEXT NOT NULL,target_id TEXT NOT NULL,customer_id TEXT NOT NULL REFERENCES users(id),amount INTEGER NOT NULL,reference TEXT NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(kind,target_id));
CREATE TABLE fiscal_policies(version INTEGER PRIMARY KEY,data TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
CREATE TABLE fiscal_documents(id TEXT PRIMARY KEY,receipt_id TEXT NOT NULL REFERENCES customer_receipts(id),kind TEXT NOT NULL,snapshot TEXT NOT NULL,status TEXT NOT NULL,provider_result TEXT,created_at TEXT NOT NULL,UNIQUE(receipt_id,kind));
CREATE UNIQUE INDEX fiscal_acceptance_evidence ON fiscal_documents(json_extract(provider_result,'$.invoiceNumber'),json_extract(provider_result,'$.controlCode')) WHERE status='ACCEPTED';
CREATE TABLE trip_routes(kind TEXT NOT NULL,target_id TEXT NOT NULL,version INTEGER NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,target_id));
CREATE TABLE driver_positions(kind TEXT NOT NULL,target_id TEXT NOT NULL,driver_id TEXT NOT NULL REFERENCES users(id),sequence INTEGER NOT NULL,latitude REAL NOT NULL,longitude REAL NOT NULL,accuracy REAL NOT NULL,captured_at TEXT NOT NULL,received_at TEXT NOT NULL,PRIMARY KEY(kind,target_id));
CREATE TABLE trip_eta(kind TEXT NOT NULL,target_id TEXT NOT NULL,route_version INTEGER NOT NULL,driver_id TEXT NOT NULL,position_sequence INTEGER NOT NULL,phase TEXT NOT NULL,result TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,target_id));
`);}
module.exports={installOperationsSchema};
