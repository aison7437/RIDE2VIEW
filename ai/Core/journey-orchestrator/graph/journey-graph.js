const { NODE_STATUS } = require('../models/journey');
function validateGraph(journey) {
  const ids=new Set();
  for(const n of journey.nodes){if(!n.node_id)throw new Error('Every node requires node_id');if(ids.has(n.node_id))throw new Error('Duplicate node_id: '+n.node_id);ids.add(n.node_id);}
  for(const n of journey.nodes)for(const d of n.dependencies)if(!ids.has(d))throw new Error(`Missing dependency ${d} for ${n.node_id}`);
  const visiting=new Set(),visited=new Set(),byId=new Map(journey.nodes.map(n=>[n.node_id,n]));
  function dfs(id){if(visiting.has(id))throw new Error('Journey graph contains a cycle');if(visited.has(id))return;visiting.add(id);for(const d of byId.get(id).dependencies)dfs(d);visiting.delete(id);visited.add(id);}
  for(const id of ids)dfs(id); return true;
}
function getReadyNodes(journey){
  const byId=new Map(journey.nodes.map(n=>[n.node_id,n]));
  return journey.nodes.filter(n=>n.status===NODE_STATUS.PENDING && n.dependencies.every(d=>byId.get(d)?.status===NODE_STATUS.SUCCESS));
}
function blockDependents(journey, failedId, failure){
  let changed=true;
  while(changed){changed=false;for(const n of journey.nodes){if(n.status!==NODE_STATUS.PENDING)continue;if(n.dependencies.some(d=>{const dep=journey.nodes.find(x=>x.node_id===d);return dep && [NODE_STATUS.FAILED,NODE_STATUS.BLOCKED].includes(dep.status);})){n.status=NODE_STATUS.BLOCKED;n.failure={code:'UPSTREAM_FAILURE',caused_by:failedId,details:failure||null};changed=true;}}}
}
module.exports={validateGraph,getReadyNodes,blockDependents};