function installJourneySchema(db){db.exec(`
 CREATE TABLE customer_details(user_id TEXT PRIMARY KEY REFERENCES users(id),details TEXT NOT NULL,version INTEGER NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE customer_profile_history(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),snapshot TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE journey_policies(version INTEGER PRIMARY KEY,policy TEXT NOT NULL,actor_id TEXT REFERENCES users(id),created_at TEXT NOT NULL);
 CREATE TABLE viewing_journeys(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,plan TEXT NOT NULL,quote TEXT,quote_expires_at TEXT,master_booking_id TEXT UNIQUE REFERENCES bookings(id),credit_amount INTEGER NOT NULL DEFAULT 0,idempotency_key TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(customer_id,idempotency_key));
 CREATE TABLE journey_stops(journey_id TEXT NOT NULL REFERENCES viewing_journeys(id),position INTEGER NOT NULL,request_id TEXT NOT NULL UNIQUE REFERENCES viewing_requests(id),booking_id TEXT UNIQUE REFERENCES bookings(id),status TEXT NOT NULL DEFAULT 'PENDING',PRIMARY KEY(journey_id,position));
 CREATE TABLE journey_events(id TEXT PRIMARY KEY,journey_id TEXT NOT NULL REFERENCES viewing_journeys(id),event TEXT NOT NULL,actor_id TEXT REFERENCES users(id),details TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE customer_credit_entries(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),journey_id TEXT NOT NULL REFERENCES viewing_journeys(id),amount INTEGER NOT NULL,event_key TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL);
 CREATE TABLE journey_refunds(journey_id TEXT PRIMARY KEY REFERENCES viewing_journeys(id),amount INTEGER NOT NULL,status TEXT NOT NULL,reference TEXT UNIQUE,verified_by TEXT REFERENCES users(id),verified_at TEXT);
 CREATE INDEX journey_customer ON viewing_journeys(customer_id,created_at);
 CREATE INDEX journey_status ON viewing_journeys(status,quote_expires_at);
 CREATE INDEX credit_customer ON customer_credit_entries(customer_id);
 CREATE TRIGGER customer_preferences_history AFTER INSERT ON customer_profiles BEGIN INSERT INTO customer_profile_history VALUES(lower(hex(randomblob(16))),NEW.user_id,NEW.preferences,NEW.updated_at); END;
 CREATE TRIGGER customer_preferences_revision AFTER UPDATE ON customer_profiles BEGIN INSERT INTO customer_profile_history VALUES(lower(hex(randomblob(16))),NEW.user_id,NEW.preferences,NEW.updated_at); END;
 `);if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get())db.exec('INSERT INTO customer_profile_history SELECT lower(hex(randomblob(16))),user_id,preferences,updated_at FROM customer_profiles');}
module.exports={installJourneySchema};
