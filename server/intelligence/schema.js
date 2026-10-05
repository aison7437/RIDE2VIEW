function installIntelligenceSchema(db){db.exec(`
 CREATE TABLE security_signal_buckets(minute TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('AUTH_FAILURE','ACCESS_DENIED','RATE_LIMITED','SERVER_ERROR')),count INTEGER NOT NULL CHECK(count>0),PRIMARY KEY(minute,kind));
 CREATE TABLE security_collection_metadata(id INTEGER PRIMARY KEY CHECK(id=1),started_at TEXT NOT NULL);
 INSERT INTO security_collection_metadata VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
`);}
module.exports={installIntelligenceSchema};
