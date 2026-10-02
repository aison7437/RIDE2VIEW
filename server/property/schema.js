function installSupplySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_profiles(
      user_id TEXT PRIMARY KEY REFERENCES users(id),legal_name TEXT NOT NULL,phone TEXT NOT NULL,
      agency_name TEXT NOT NULL,registration_number TEXT NOT NULL,updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS supply_documents(
      id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,
      name TEXT NOT NULL,mime TEXT NOT NULL,content BLOB NOT NULL,sha256 TEXT NOT NULL,created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS supply_checks(
      kind TEXT NOT NULL,target_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'DRAFT',
      revision INTEGER NOT NULL DEFAULT 1,evidence TEXT NOT NULL DEFAULT '[]',reason TEXT,
      reviewer_id TEXT REFERENCES users(id),expires_at TEXT,updated_at TEXT NOT NULL,
      PRIMARY KEY(kind,target_id),
      CHECK(kind IN ('identity','agency','marketing','ownership','publication')),
      CHECK(status IN ('DRAFT','PENDING','APPROVED','REJECTED','REVOKED'))
    );
    CREATE TABLE IF NOT EXISTS property_media(
      id TEXT PRIMARY KEY,listing_id TEXT NOT NULL REFERENCES listings(id),kind TEXT NOT NULL,
      url TEXT NOT NULL,caption TEXT NOT NULL,created_at TEXT NOT NULL,
      CHECK(kind IN ('photo','video','tour360'))
    );
    CREATE TABLE IF NOT EXISTS property_slots(
      id TEXT PRIMARY KEY,listing_id TEXT NOT NULL REFERENCES listings(id),start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,
      UNIQUE(listing_id,start_at,end_at)
    );
    CREATE TABLE IF NOT EXISTS viewing_requests(
      id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),listing_id TEXT NOT NULL REFERENCES listings(id),
      slot_id TEXT NOT NULL REFERENCES property_slots(id),tier TEXT NOT NULL,status TEXT NOT NULL,
      booking_id TEXT UNIQUE REFERENCES bookings(id),idempotency_key TEXT NOT NULL,
      reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
      UNIQUE(customer_id,idempotency_key),CHECK(status IN ('REQUESTED','ACCEPTED','DECLINED','CANCELLED','EXPIRED'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS viewing_slot_active ON viewing_requests(slot_id) WHERE status IN ('REQUESTED','ACCEPTED');
    CREATE INDEX IF NOT EXISTS viewing_customer ON viewing_requests(customer_id,created_at);
    CREATE INDEX IF NOT EXISTS viewing_property ON viewing_requests(listing_id,created_at);
    CREATE INDEX IF NOT EXISTS supply_review_queue ON supply_checks(status,kind);
    CREATE INDEX IF NOT EXISTS property_slot_time ON property_slots(listing_id,start_at,end_at);
    CREATE TABLE IF NOT EXISTS property_leads(
      request_id TEXT PRIMARY KEY REFERENCES viewing_requests(id),stage TEXT NOT NULL DEFAULT 'QUALIFIED',
      notes TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL,
      CHECK(stage IN ('QUALIFIED','VIEWED','FOLLOW_UP','NEGOTIATING','WON','LOST'))
    );
    CREATE TABLE IF NOT EXISTS viewing_outcomes(
      request_id TEXT PRIMARY KEY REFERENCES viewing_requests(id),outcome TEXT NOT NULL,
      notes TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,
      CHECK(outcome IN ('INTERESTED','NOT_INTERESTED','FOLLOW_UP'))
    );
    CREATE TABLE IF NOT EXISTS customer_profiles(
      user_id TEXT PRIMARY KEY REFERENCES users(id),preferences TEXT NOT NULL,updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saved_properties(
      customer_id TEXT NOT NULL REFERENCES users(id),listing_id TEXT NOT NULL REFERENCES listings(id),
      created_at TEXT NOT NULL,PRIMARY KEY(customer_id,listing_id)
    );
    CREATE TABLE IF NOT EXISTS viewing_qualifications(
      request_id TEXT PRIMARY KEY REFERENCES viewing_requests(id),snapshot TEXT NOT NULL,created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_commissions(
      id TEXT PRIMARY KEY,request_id TEXT UNIQUE NOT NULL REFERENCES viewing_requests(id),
      agent_id TEXT NOT NULL REFERENCES users(id),amount INTEGER NOT NULL CHECK(amount>0),
      currency TEXT NOT NULL DEFAULT 'KES',status TEXT NOT NULL,evidence_ref TEXT NOT NULL,
      payment_reference TEXT UNIQUE,updated_at TEXT NOT NULL,
      CHECK(status IN ('EARNED','PENDING','DISPUTED','PAID'))
    );
    CREATE TABLE IF NOT EXISTS agent_reviews(
      request_id TEXT PRIMARY KEY REFERENCES viewing_requests(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,created_at TEXT NOT NULL
    );
  `);
  // Prior publication flags carry no documentary evidence. Keep inventory, require review.
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='listings'").get()) {
    db.exec("UPDATE listings SET approved=0");
  }
}
module.exports={installSupplySchema};
