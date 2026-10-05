const {randomUUID,createHash}=require('node:crypto');
const {JourneyOrchestrator}=require('../../ai/Core/journey-orchestrator');
const {createJourney}=require('../../ai/Core/journey-orchestrator/models/journey');
const {createPlanner}=require('./planner');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const now=()=>new Date().toISOString();
function createAgentWorkflows({db,supply,expansion,audit=()=>{}}) {
 const planner=createPlanner({db,supply,expansion}),running=new Set();let stopping=false;
 function tx(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 function owner(actor,id){if(!actor)fail(401,'Sign in to continue');const row=db.prepare('SELECT * FROM agent_workflows WHERE id=? AND owner_id=?').get(id,actor.id);if(!row)fail(404,'Agent workflow not found');planner.authorize(actor,JSON.parse(row.request));return row;}
 function event(actor,id,type,details={}){db.prepare('INSERT INTO agent_workflow_events VALUES(?,?,?,?,?,?)').run(randomUUID(),id,actor.id,type,JSON.stringify(details),now());audit(actor,'agent_workflow.'+type.toLowerCase(),id,details);}
 function present(row){
  let status=row.status;if(!['REVIEWED','DISMISSED'].includes(status)&&row.expires_at<=now())status='EXPIRED';else if(status==='RUNNING'&&row.lease_until<=Date.now())status='RECOVERABLE';
  const j=JSON.parse(row.journey);
  return {id:row.id,workflow:row.workflow,status,version:row.version,createdAt:row.created_at,expiresAt:row.expires_at,authority:'RECOMMENDATION_ONLY',nodes:j.nodes.map(n=>({id:n.node_id,agent:n.responsible_agent,status:n.status,output:n.output,source:n.provenance,confidence:n.confidence,failure:n.failure,attempts:n.attempts})),limitations:['Outputs describe a saved snapshot. Recheck availability and prices in the booking or order workspace.','Review records your acknowledgement only; it does not book, pay, dispatch, publish or contact anyone.','Scores are heuristic rankings, not calibrated probabilities. Missing external evidence remains unavailable.']};
 }
 function get(actor,id){const row=owner(actor,id);return {...present(row),events:db.prepare('SELECT event,details,created_at FROM agent_workflow_events WHERE workflow_id=? ORDER BY rowid').all(id).map(e=>({...e,details:JSON.parse(e.details)}))};}
 function list(actor){if(!actor)fail(401,'Sign in to continue');return db.prepare('SELECT * FROM agent_workflows WHERE owner_id=? ORDER BY created_at DESC LIMIT 30').all(actor.id).map(present);}
 async function execute(actor,id){
  if(stopping)fail(503,'Agent service is stopping');
  const claim=tx(()=>{const row=owner(actor,id);if(row.expires_at<=now())fail(409,'Workflow expired; create a fresh assessment');if(row.status!=='PENDING'&&!(row.status==='RUNNING'&&row.lease_until<=Date.now()))return null;
   const token=randomUUID();db.prepare("UPDATE agent_workflows SET status='RUNNING',lease_token=?,lease_until=?,version=version+1,updated_at=? WHERE id=?").run(token,Date.now()+60000,now(),id);event(actor,id,'STARTED');return {row,token};});
  if(!claim)return get(actor,id);
  const token=claim.token;const journey=JSON.parse(claim.row.journey);
  // These are read-only local computations. Interrupted nodes can safely recompute their saved input.
  for(const n of journey.nodes)if(n.status==='RUNNING')n.status='PENDING';
  const store={save:async j=>{
   const updated=db.prepare("UPDATE agent_workflows SET journey=?,updated_at=? WHERE id=? AND status='RUNNING' AND lease_token=? AND lease_until>?").run(JSON.stringify(j),now(),id,token,Date.now());
   if(!updated.changes)fail(409,'Agent execution lease lost');
  }};
  const task=(async()=>{
   try{
    const orchestrator=new JourneyOrchestrator({store,maxConcurrency:1});
    const result=await orchestrator.run(journey);
    tx(()=>{
     const row=owner(actor,id);if(row.lease_token!==token||row.lease_until<=Date.now())fail(409,'Agent execution lease lost');
     const hasFailure=result.nodes.some(n=>['FAILED','BLOCKED'].includes(n.status));
     const waits=result.nodes.some(n=>n.status==='WAITING_CONFIRMATION');
     const status=hasFailure?'PARTIAL':waits?'REVIEW_REQUIRED':'COMPLETED';
     db.prepare('UPDATE agent_workflows SET status=?,journey=?,lease_token=NULL,lease_until=NULL,version=version+1,updated_at=? WHERE id=?').run(status,JSON.stringify(result),now(),id);event(actor,id,'FINISHED',{status});
    });
    return get(actor,id);
   }catch(e){
    // Do not replace a newer worker's output. Infrastructure interruptions remain explicitly recoverable.
    db.prepare("UPDATE agent_workflows SET lease_until=0,updated_at=? WHERE id=? AND status='RUNNING' AND lease_token=?").run(now(),id,token);
    throw e;
   }
  })();
  running.add(task);try{return await task;}finally{running.delete(task);}
 }
 async function create(actor,body){
  if(stopping)fail(503,'Agent service is stopping');
  const request=planner.normalize(actor,body),key=body.idempotencyKey;
  if(typeof key!=='string'||key.length<8||key.length>128)fail(400,'Idempotency key must contain 8–128 characters');
  const encoded=JSON.stringify(request),hash=createHash('sha256').update(encoded).digest('hex');
  const prior=db.prepare('SELECT * FROM agent_workflows WHERE owner_id=? AND idempotency_key=?').get(actor.id,key);
  if(prior){if(prior.request_hash!==hash)fail(409,'Idempotency key already used for different input');return get(actor,prior.id);}
  const recent=db.prepare('SELECT count(*) n FROM agent_workflows WHERE owner_id=? AND created_at>?').get(actor.id,new Date(Date.now()-60000).toISOString()).n;
  if(recent>=10)fail(429,'Too many assessments; try again in a minute');
  const id=randomUUID(),nodes=planner.plan(actor,request),time=now();
  const journey=createJourney({id,intent:{workflow:request.workflow},nodes});
  tx(()=>{db.prepare('INSERT INTO agent_workflows(id,owner_id,workflow,request,request_hash,idempotency_key,status,journey,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,\'PENDING\',?,?,?,?)').run(id,actor.id,request.workflow,encoded,hash,key,JSON.stringify(journey),new Date(Date.now()+15*60000).toISOString(),time,time);event(actor,id,'CREATED');});
  return execute(actor,id);
 }
 function review(actor,id,body){return tx(()=>{
  const row=owner(actor,id);if(!['REVIEWED','DISMISSED'].includes(body.decision))fail(400,'Choose REVIEWED or DISMISSED');
  if(row.status===body.decision)return get(actor,id);
  if(body.version!==row.version)fail(409,'Assessment changed; refresh first');
  if(row.expires_at<=now())fail(409,'Assessment expired; run a fresh assessment');
  if(!['COMPLETED','REVIEW_REQUIRED','PARTIAL'].includes(row.status))fail(409,'Assessment is not ready for review');
  db.prepare('UPDATE agent_workflows SET status=?,version=version+1,updated_at=? WHERE id=?').run(body.decision,now(),id);event(actor,id,body.decision,{meaning:'Acknowledgement only; no domain action executed'});return get(actor,id);
 });}
 async function routes({path,method,user,body,send}){
  if(path==='/api/agents/choices'&&method==='GET'){if(!user)fail(401,'Sign in to continue');send(200,{shipments:user.role==='customer'?db.prepare('SELECT id,shipment_class,status FROM logistics_shipments WHERE customer_id=? ORDER BY created_at DESC LIMIT 100').all(user.id):[]});return true;}
  if(path==='/api/agents/capabilities'&&method==='GET'){if(!user)fail(401,'Sign in to continue');send(200,{workflows:planner.catalog.filter(x=>x.roles.includes(user.role)),authority:'RECOMMENDATION_ONLY'});return true;}
  if(path==='/api/agents/workflows'&&method==='GET'){send(200,{workflows:list(user)});return true;}
  if(path==='/api/agents/workflows'&&method==='POST'){send(201,await create(user,body));return true;}
  const match=path.match(/^\/api\/agents\/workflows\/([^/]+)(?:\/(resume|review))?$/);
  if(!match)return false;
  if(method==='GET'&&!match[2]){send(200,get(user,match[1]));return true;}
  if(method==='POST'&&match[2]==='resume'){send(200,await execute(user,match[1]));return true;}
  if(method==='POST'&&match[2]==='review'){send(200,review(user,match[1],body));return true;}
  return false;
 }
 return {create,execute,get,list,review,routes,stop:async()=>{stopping=true;await Promise.allSettled([...running]);}};
}
module.exports={createAgentWorkflows};
