const {randomUUID}=require('node:crypto');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const now=()=>new Date().toISOString();
const roles=['customer','agent','driver','admin'];
function createMemory({db,assessment}) {
 function actor(a){if(!a)fail(401,'Sign in to continue');if(!roles.includes(a.role))fail(403,'Memory is not available for this account');}
 function settings(a){actor(a);const r=db.prepare('SELECT * FROM agent_memory_settings WHERE owner_id=?').get(a.id);return {enabled:Boolean(r?.enabled),version:r?.version||0};}
 function entries(a){actor(a);return db.prepare('SELECT * FROM agent_memory_entries WHERE owner_id=? ORDER BY updated_at DESC,id').all(a.id);}
 function accessible(a,e){if(e.role!==a.role)return false;try{assessment(a,e.source_workflow_id);return true;}catch{return false;}}
 function view(a){const s=settings(a);return {...s,entries:entries(a).filter(e=>accessible(a,e)).map(e=>({id:e.id,kind:e.kind,subjectId:e.subject_id,value:e.value,sourceWorkflowId:e.source_workflow_id,sourceVersion:e.source_version,updatedAt:e.updated_at,expiresAt:e.expires_at,active:s.enabled&&e.expires_at>now()})),retentionDays:90,limit:200};}
 function mutate(a,body,fn){actor(a);db.exec('BEGIN IMMEDIATE');try{const s=settings(a);if(!Number.isSafeInteger(body.version)||body.version!==s.version)fail(409,'Memory changed; refresh first');db.prepare('DELETE FROM agent_memory_entries WHERE owner_id=? AND expires_at<=?').run(a.id,now());const enabled=fn(s);db.prepare('INSERT INTO agent_memory_settings VALUES(?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET enabled=excluded.enabled,version=excluded.version,updated_at=excluded.updated_at').run(a.id,enabled===undefined?Number(s.enabled):Number(enabled),s.version+1,now());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return view(a);}
 function exact(body,keys){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!keys.includes(k)))fail(400,'Unexpected memory input');}
 function configure(a,body){exact(body,['version','enabled']);if(typeof body.enabled!=='boolean')fail(400,'Choose whether memory is enabled');return mutate(a,body,()=>body.enabled);}
 function remember(a,body){exact(body,['version','kind','sourceWorkflowId','listingId','value']);return mutate(a,body,s=>{
  if(!s.enabled)fail(409,'Enable memory before saving feedback');
  if(typeof body.sourceWorkflowId!=='string'||body.sourceWorkflowId.length>128)fail(400,'Choose a source assessment');
  const source=assessment(a,body.sourceWorkflowId);if(!['COMPLETED','REVIEW_REQUIRED','PARTIAL','REVIEWED','DISMISSED','EXPIRED'].includes(source.status))fail(409,'Assessment is not ready for feedback');
  if(source.workflow==='memory-learning'||source.workflow==='ai-critic')fail(400,'Choose an original operational assessment');
  let subject=source.id,value=body.value;
  if(body.kind==='FEEDBACK'){if(!['HELPFUL','NOT_HELPFUL'].includes(value)||body.listingId!==undefined)fail(400,'Choose helpful or not helpful');}
  else if(body.kind==='EXCLUDE_PROPERTY'){
   if(a.role!=='customer'||!['property-advice','opportunities'].includes(source.workflow))fail(403,'Property memory requires your property assessment');
   if(typeof body.listingId!=='string'||body.listingId.length>128||value!=='EXCLUDE')fail(400,'Choose a recommended property');
   const ids=source.nodes.flatMap(n=>n.agent==='property-agent'?(n.output?.properties||[]):n.agent==='opportunity-agent'?(n.output?.opportunities||[]):[]).filter(p=>p&&typeof p.id==='string').map(p=>p.id);
   if(!ids.includes(body.listingId))fail(400,'Property is not a recommendation in this assessment');subject=body.listingId;
  }else fail(400,'Unknown memory kind');
  const prior=db.prepare('SELECT id FROM agent_memory_entries WHERE owner_id=? AND kind=? AND subject_id=?').get(a.id,body.kind,subject);
  if(!prior&&entries(a).length>=200)fail(409,'Memory is full; remove an entry first');
  const time=now(),expires=new Date(Date.now()+90*86400000).toISOString();
  db.prepare(`INSERT INTO agent_memory_entries VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,kind,subject_id) DO UPDATE SET role=excluded.role,value=excluded.value,source_workflow_id=excluded.source_workflow_id,source_version=excluded.source_version,updated_at=excluded.updated_at,expires_at=excluded.expires_at`).run(prior?.id||randomUUID(),a.id,a.role,body.kind,subject,value,source.id,source.version,time,time,expires);
 });}
 function forget(a,id,body){exact(body,['version']);return mutate(a,body,()=>{if(!db.prepare('DELETE FROM agent_memory_entries WHERE owner_id=? AND id=?').run(a.id,id).changes)fail(404,'Memory entry not found');});}
 function clear(a,body){exact(body,['version']);return mutate(a,body,()=>{db.prepare('DELETE FROM agent_memory_entries WHERE owner_id=?').run(a.id);return false;});}
 function snapshot(a){const v=view(a),active=v.entries.filter(e=>e.active);const counts={HELPFUL:0,NOT_HELPFUL:0};for(const e of active)if(e.kind==='FEEDBACK')counts[e.value]++;return {enabled:v.enabled,version:v.version,generatedAt:now(),validUntil:active.map(e=>e.expiresAt).sort()[0]||null,feedback:counts,exclusions:active.filter(e=>e.kind==='EXCLUDE_PROPERTY').map(e=>({listingId:e.subjectId,memoryId:e.id,sourceWorkflowId:e.sourceWorkflowId,sourceVersion:e.sourceVersion,expiresAt:e.expiresAt})),limitations:['Memory is shared only among this account’s assistants.','Only explicit feedback is retained; no sensitive traits are inferred.','Feedback counts describe opinions, not measured model accuracy.','Excluded properties stay out of new property assessments; profile and current eligibility remain authoritative.','Pausing or clearing affects future assessments. Historical assessment snapshots remain in assessment history.']};}
 function assertCurrent(a,nodes){for(const n of nodes){const m=n.input?.memoryState;if(m&&(m.version!==settings(a).version||m.validUntil&&m.validUntil<=now()))fail(409,'Memory changed or expired; create a fresh assessment');}}
 function routes({path,method,user,body,send}){
  if(path==='/api/agents/memory'&&method==='GET'){send(200,view(user));return true;}
  if(path==='/api/agents/memory/settings'&&method==='POST'){send(200,configure(user,body));return true;}
  if(path==='/api/agents/memory/entries'&&method==='POST'){send(201,remember(user,body));return true;}
  if(path==='/api/agents/memory/clear'&&method==='POST'){send(200,clear(user,body));return true;}
  const m=path.match(/^\/api\/agents\/memory\/entries\/([^/]+)\/forget$/);if(m&&method==='POST'){send(200,forget(user,m[1],body));return true;}return false;
 }
 return {view,configure,remember,forget,clear,snapshot,assertCurrent,routes};
}
module.exports={createMemory};
