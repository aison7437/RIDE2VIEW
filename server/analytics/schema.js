function installAnalyticsSchema(db){db.exec(`
 CREATE TABLE discovery_search_events(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),listing_ids TEXT NOT NULL,result_count INTEGER NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE discovery_selection_events(search_id TEXT NOT NULL REFERENCES discovery_search_events(id),listing_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(search_id,listing_id));
 CREATE INDEX discovery_search_time ON discovery_search_events(created_at,customer_id);
 CREATE INDEX discovery_selection_time ON discovery_selection_events(search_id,created_at);
 CREATE TABLE analytics_collection_metadata(id INTEGER PRIMARY KEY CHECK(id=1),started_at TEXT NOT NULL);
 INSERT INTO analytics_collection_metadata VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
 `);}
module.exports={installAnalyticsSchema};
