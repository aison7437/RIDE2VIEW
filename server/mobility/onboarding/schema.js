function installMobilitySchema(db){
 db.exec(`
 CREATE TABLE driver_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),payload TEXT NOT NULL,revision INTEGER NOT NULL,online INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL);
 CREATE TABLE mobility_documents(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,content BLOB NOT NULL,sha256 TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE mobility_checks(subject_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,profile_revision INTEGER,evidence TEXT NOT NULL,reason TEXT,reviewer_id TEXT REFERENCES users(id),expires_at TEXT,updated_at TEXT NOT NULL,PRIMARY KEY(subject_id,kind));
 CREATE TABLE mobility_review_events(id TEXT PRIMARY KEY,subject_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,event TEXT NOT NULL,actor_id TEXT REFERENCES users(id),details TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE ride2go_policies(version INTEGER PRIMARY KEY,policy TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
 CREATE TABLE ride2go_trips(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),plan TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,quote TEXT,expires_at TEXT,driver_id TEXT REFERENCES users(id),idempotency_key TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(customer_id,idempotency_key));
 CREATE TABLE ride2go_payments(id TEXT PRIMARY KEY,trip_id TEXT NOT NULL UNIQUE REFERENCES ride2go_trips(id),amount INTEGER NOT NULL CHECK(amount>0),status TEXT NOT NULL,reference TEXT UNIQUE,verified_by TEXT REFERENCES users(id),verified_at TEXT);
 CREATE TABLE ride2go_assignments(id TEXT PRIMARY KEY,trip_id TEXT NOT NULL REFERENCES ride2go_trips(id),driver_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL,lease_expires_at TEXT,idempotency_key TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE UNIQUE INDEX ride2go_active_trip ON ride2go_assignments(trip_id) WHERE status IN ('OFFERED','ASSIGNED','ARRIVED','IN_PROGRESS');
 CREATE TABLE ride2go_start_codes(trip_id TEXT PRIMARY KEY REFERENCES ride2go_trips(id),code TEXT NOT NULL,attempts INTEGER NOT NULL);
 CREATE TABLE ride2go_events(id TEXT PRIMARY KEY,trip_id TEXT NOT NULL REFERENCES ride2go_trips(id),event TEXT NOT NULL,actor_id TEXT REFERENCES users(id),details TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE ride2go_refunds(trip_id TEXT PRIMARY KEY REFERENCES ride2go_trips(id),amount INTEGER NOT NULL,status TEXT NOT NULL,reference TEXT UNIQUE,verified_by TEXT REFERENCES users(id),verified_at TEXT);
 CREATE INDEX ride2go_customer ON ride2go_trips(customer_id,created_at);
 CREATE INDEX mobility_review_queue ON mobility_checks(status,kind);
 `);
 // A historical approval flag is not documentary verification. Retain active trips for recovery.
 if(db.prepare("PRAGMA table_info('users')").all().some(c=>c.name==='verified')&&db.prepare("PRAGMA table_info('users')").all().some(c=>c.name==='role'))db.exec("UPDATE users SET verified=0 WHERE role='driver'");
}
module.exports={installMobilitySchema};
