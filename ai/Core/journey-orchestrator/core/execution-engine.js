const { NODE_STATUS } = require('../models/journey');
function normalizeResult(node, journey, result){
  if(!result || typeof result!=='object') throw new Error('Malformed agent result');
  const allowed=new Set(['SUCCESS','FAILED','BLOCKED','PARTIAL','UNAVAILABLE']);
  if(!allowed.has(result.status)) throw new Error('Unsupported agent result status');
  return {...result,task_id:result.task_id||node.node_id,journey_id:result.journey_id||journey.journey_id,schema_version:result.schema_version||'1.0',timestamp:result.timestamp||new Date().toISOString()};
}
async function executeWithPolicy({journey,node,registry,store}){
  const adapter=registry[node.responsible_agent];
  node.status=NODE_STATUS.RUNNING;node.started_at=new Date().toISOString();node.attempts+=1;await store.save(journey);
  if(!adapter){node.status=NODE_STATUS.FAILED;node.failure={code:'AGENT_NOT_REGISTERED'};node.completed_at=new Date().toISOString();return node;}
  let timer;
  try{
    const task={task_id:node.node_id,journey_id:journey.journey_id,input:node.input};
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TIMEOUT')),node.timeout);});
    const raw=await Promise.race([adapter.execute(task,{journey}),timeout]);
    const result=normalizeResult(node,journey,raw);
    node.result_status=result.status;node.output=result.data;node.confidence=result.confidence;node.provenance=result.source||[];
    if(result.requires_confirmation && result.status==='SUCCESS'){node.status=NODE_STATUS.WAITING_CONFIRMATION;}
    else if(result.status==='SUCCESS'){node.status=NODE_STATUS.SUCCESS;}
    else if(result.status==='PARTIAL'){node.status=NODE_STATUS.PARTIAL;}
    else {node.status=NODE_STATUS.FAILED;node.failure=result.error||{code:result.status};}
  }catch(error){
    node.status=NODE_STATUS.FAILED;node.failure={code:error.message==='TIMEOUT'?'TIMEOUT':'EXECUTION_ERROR',message:error.message};
  }finally{clearTimeout(timer);node.completed_at=new Date().toISOString();await store.save(journey);}
  return node;
}
module.exports={executeWithPolicy,normalizeResult};