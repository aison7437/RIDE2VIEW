const NODE_STATUS = Object.freeze({
  PENDING:'PENDING', READY:'READY', RUNNING:'RUNNING', WAITING_CONFIRMATION:'WAITING_CONFIRMATION',
  SUCCESS:'SUCCESS', PARTIAL:'PARTIAL', FAILED:'FAILED', BLOCKED:'BLOCKED', SKIPPED:'SKIPPED', CANCELLED:'CANCELLED'
});
function createNode(node) {
  const now = new Date().toISOString();
  return {
    node_id: node.node_id,
    type: node.type,
    responsible_agent: node.responsible_agent,
    input: node.input || {},
    output: null,
    dependencies: node.dependencies || [],
    status: node.status || NODE_STATUS.PENDING,
    confidence: node.confidence ?? null,
    provenance: node.provenance || [],
    attempts: node.attempts || 0,
    timeout: node.timeout || 5000,
    retry_policy: node.retry_policy || { max_attempts: 1 },
    idempotency_key: node.idempotency_key || null,
    criticality: node.criticality || 'critical',
    created_at: node.created_at || now,
    started_at: null,
    completed_at: null,
    failure: null
  };
}
function createJourney({id,intent,nodes}) {
  const now=new Date().toISOString();
  return { schema_version:'1.0', journey_id:id, intent:intent||{}, nodes:(nodes||[]).map(createNode), created_at:now, updated_at:now, completed:false };
}
module.exports={NODE_STATUS,createNode,createJourney};