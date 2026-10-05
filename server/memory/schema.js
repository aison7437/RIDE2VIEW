function installMemorySchema(db) {
 db.exec(`CREATE TABLE agent_memory_settings(
  owner_id TEXT PRIMARY KEY REFERENCES users(id), enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  version INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
 );
 CREATE TABLE agent_memory_entries(
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('FEEDBACK','EXCLUDE_PROPERTY')), subject_id TEXT NOT NULL,
  value TEXT NOT NULL CHECK(value IN ('HELPFUL','NOT_HELPFUL','EXCLUDE')),
  source_workflow_id TEXT NOT NULL REFERENCES agent_workflows(id), source_version INTEGER NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT NOT NULL,
  UNIQUE(owner_id,kind,subject_id)
 );
 CREATE INDEX agent_memory_owner ON agent_memory_entries(owner_id,expires_at);`);
}
module.exports={installMemorySchema};
