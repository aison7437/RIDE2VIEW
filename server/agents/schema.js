function installAgentWorkflowSchema(db) {
  db.exec(`CREATE TABLE agent_workflows(
    id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),workflow TEXT NOT NULL,
    request TEXT NOT NULL,request_hash TEXT NOT NULL,idempotency_key TEXT NOT NULL,
    status TEXT NOT NULL,journey TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,
    lease_token TEXT,lease_until INTEGER,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
    UNIQUE(owner_id,idempotency_key)
  );
  CREATE INDEX agent_workflow_owner ON agent_workflows(owner_id,created_at);
  CREATE TABLE agent_workflow_events(
    id TEXT PRIMARY KEY,workflow_id TEXT NOT NULL REFERENCES agent_workflows(id),actor_id TEXT NOT NULL REFERENCES users(id),
    event TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL
  );`);
}
module.exports={installAgentWorkflowSchema};
