function installAgentVisibilitySchema(db){
 db.exec(`
 CREATE TABLE agent_visibility_plans(
  code TEXT PRIMARY KEY,name TEXT NOT NULL,price_kes INTEGER NOT NULL CHECK(price_kes>=0),
  duration_days INTEGER NOT NULL CHECK(duration_days>0),
  listing_limit INTEGER NOT NULL CHECK(listing_limit>0),
  featured_slots INTEGER NOT NULL CHECK(featured_slots>=0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
 );
 CREATE TABLE agent_visibility_subscriptions(
  id TEXT PRIMARY KEY,agent_id TEXT NOT NULL REFERENCES users(id),
  plan_code TEXT NOT NULL REFERENCES agent_visibility_plans(code),
  status TEXT NOT NULL CHECK(status IN ('PENDING','ACTIVE','EXPIRED','CANCELLED')),
  starts_at TEXT,ends_at TEXT,payment_reference TEXT UNIQUE,
  amount_kes INTEGER NOT NULL CHECK(amount_kes>=0),
  listing_limit INTEGER NOT NULL,featured_slots INTEGER NOT NULL,
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 );
 CREATE INDEX agent_visibility_agent ON agent_visibility_subscriptions(agent_id,status,ends_at);
 CREATE TABLE agent_featured_listings(
  agent_id TEXT NOT NULL REFERENCES users(id),listing_id TEXT NOT NULL REFERENCES listings(id),
  subscription_id TEXT NOT NULL REFERENCES agent_visibility_subscriptions(id),
  created_at TEXT NOT NULL,PRIMARY KEY(agent_id,listing_id)
 );
 `);
 const insert=db.prepare('INSERT INTO agent_visibility_plans(code,name,price_kes,duration_days,listing_limit,featured_slots) VALUES(?,?,?,?,?,?)');
 insert.run('BASIC','Basic',0,30,3,0);
 insert.run('PROFESSIONAL','Professional',2499,30,15,0);
 insert.run('PREMIUM','Premium',5999,30,50,5);
}
module.exports={installAgentVisibilitySchema};
