const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../server/app');
const {createHash}=require('node:crypto');
const {JourneyOrchestrator}=require('../ai/Core/journey-orchestrator');
function fixture(t){const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false});t.after(()=>app.close());const users={};for(const [id,role] of [['admin','admin'],['otheradmin','admin'],['customer','customer'],['other','customer']]){app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,id+'@test.example',id,'unused',role);users[id]={id,role};}return {app,...users};}
const key=()=>require('node:crypto').randomUUID();
const run=(f,actor,workflow,extra={})=>f.app.agentWorkflows.create(actor,{workflow,idempotencyKey:key(),...extra});
function mutate(f,id,change){const j=JSON.parse(f.app.db.prepare('SELECT journey FROM agent_workflows WHERE id=?').get(id).journey);change(j);f.app.db.prepare('UPDATE agent_workflows SET journey=? WHERE id=?').run(JSON.stringify(j),id);}
function booking(f,id='b',amount=650){const db=f.app.db,time=new Date().toISOString();db.prepare('INSERT OR IGNORE INTO listings VALUES(?,?,?,0,1)').run('l','admin','{}');db.prepare("INSERT INTO bookings VALUES(?,?,?,'general',?,'requested',?,NULL,?)").run(id,'customer','l',amount,time,time);db.prepare("INSERT INTO payments VALUES(?,?,?,'pending',NULL,NULL,NULL)").run(id,id,amount);}
test('quality detects amount and binding inconsistencies without changing the source records',async t=>{
 const f=fixture(t);booking(f);f.app.db.prepare("UPDATE payments SET amount=700 WHERE id='b'").run();
 const result=await run(f,f.admin,'data-quality');const o=result.nodes[0].output;assert.equal(o.checkedRules,16);assert(o.findings.some(x=>x.rule==='booking_payment'&&x.count===1));assert(o.findings.some(x=>x.rule==='missing_reservation'));
 const evidence=f.app.quality.evidence(f.admin,{rule:'booking_payment'});assert.equal(evidence.records[0].payment_amount,700);assert.equal(evidence.records[0].booking_amount,650);assert.equal(f.app.db.prepare("SELECT amount FROM payments WHERE id='b'").get().amount,700);
 assert.throws(()=>f.app.quality.evidence(f.customer,{rule:'booking_payment'}),/Administrator/);assert.throws(()=>f.app.quality.evidence(f.admin,{rule:'__proto__'}),/Unknown/);
});
test('zero-cash paid bookings are not labelled missing-journal; legacy positive cash is flagged for review only',t=>{
 const f=fixture(t);booking(f,'zero',0);booking(f,'legacy',650);f.app.db.prepare("UPDATE payments SET status='paid'").run();const e=f.app.quality.evidence(f.admin,{rule:'missing_journal'});assert.equal(e.total,1);assert.equal(e.records[0].id,'legacy');assert(!JSON.stringify(e).includes('reference'));
});
test('quality handles malformed JSON, expired reviews and invalid slots; evidence is paginated',t=>{
 const f=fixture(t),db=f.app.db;for(let i=0;i<53;i++)db.prepare('INSERT INTO listings VALUES(?,?,?,1,1)').run('bad-'+i,'admin','not json');db.prepare("INSERT INTO property_slots VALUES('bad-slot','bad-0','invalid','invalid',1,?)").run(new Date().toISOString());
 const snapshot=f.app.quality.snapshot(f.admin);assert.equal(snapshot.checks.find(x=>x.rule==='invalid_listing_json').count,53);assert.equal(snapshot.checks.find(x=>x.rule==='stale_publication').count,53);assert.equal(snapshot.checks.find(x=>x.rule==='invalid_slot').count,1);
 assert.equal(f.app.quality.evidence(f.admin,{rule:'invalid_listing_json'}).records.length,50);assert.equal(f.app.quality.evidence(f.admin,{rule:'invalid_listing_json',offset:50}).records.length,3);assert.throws(()=>f.app.quality.evidence(f.admin,{rule:'invalid_listing_json',offset:-1}),/offset/);
});
test('critic reconciles good analytics then flags altered denominators and financial groups',async t=>{
 const f=fixture(t),source=await run(f,f.admin,'operations-intelligence');
 let critic=await run(f,f.admin,'ai-critic',{targetWorkflowId:source.id});assert.equal(critic.nodes[0].output.verdict,'NO_ISSUE_DETECTED_BY_IMPLEMENTED_CHECKS');
 mutate(f,source.id,j=>{j.nodes[0].output.conversion.requestToCompleted.percent=100;j.nodes[0].output.finance.ledger=[{currency:'KES',amount:9999}];});
 critic=await run(f,f.admin,'ai-critic',{targetWorkflowId:source.id});const codes=critic.nodes[0].output.findings.map(f=>f.code);assert(codes.includes('INVALID_CONVERSION'));assert(codes.includes('FINANCE_DIFFERS_FROM_SOURCE'));assert.equal(critic.nodes[0].output.verdict,'REVIEW_REQUIRED');assert.equal(critic.nodes[0].output.sourceAssessment.hash.length,64);
});
test('critic separates changed current payment and expired advice from incorrect saved arithmetic',async t=>{
 const f=fixture(t);booking(f);const source=await run(f,f.customer,'booking-review',{bookingId:'b'});f.app.db.prepare("UPDATE payments SET status='paid' WHERE id='b'").run();f.app.db.prepare("UPDATE agent_workflows SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(source.id);
 const critic=await run(f,f.customer,'ai-critic',{targetWorkflowId:source.id}),findings=critic.nodes[0].output.findings;
 assert(findings.some(x=>x.code==='PAYMENT_CHANGED'&&x.severity==='MEDIUM'));assert(findings.some(x=>x.code==='STALE_ASSESSMENT'));assert(!findings.some(x=>x.code==='PAYMENT_DIFFERS_FROM_SOURCE'));assert.equal(critic.nodes[0].output.verdict,'STALE_OR_INCOMPLETE_EVIDENCE');
});
test('critic refuses other owners, recursive critiques and source access after role demotion',async t=>{
 const f=fixture(t),source=await run(f,f.admin,'operations-intelligence');
 await assert.rejects(run(f,f.otheradmin,'ai-critic',{targetWorkflowId:source.id}),/not found/);const critic=await run(f,f.admin,'ai-critic',{targetWorkflowId:source.id});await assert.rejects(run(f,f.admin,'ai-critic',{targetWorkflowId:critic.id}),/original assessment/);
 const demoted={id:'admin',role:'customer'};assert.equal(f.app.agentWorkflows.list(demoted).length,0);assert.throws(()=>f.app.agentWorkflows.get(demoted,critic.id),/not available/);await assert.rejects(run(f,f.customer,'data-quality'),/not available/);
});
test('malformed saved journey remains inspectable and produces a critic finding instead of breaking history',async t=>{
 const f=fixture(t),source=await run(f,f.customer,'property-advice');f.app.db.prepare('UPDATE agent_workflows SET journey=? WHERE id=?').run('invalid',source.id);
 assert.equal(f.app.agentWorkflows.list(f.customer)[0].status,'CORRUPT');const critic=await run(f,f.customer,'ai-critic',{targetWorkflowId:source.id});assert(critic.nodes[0].output.findings.some(x=>x.code==='MALFORMED_JOURNEY'));
});
test('critic flags missing sources, invalid confidence and execution authority overclaims',async t=>{
 const f=fixture(t),source=await run(f,f.customer,'property-advice');mutate(f,source.id,j=>{j.nodes[0].provenance=[];j.nodes[0].confidence=2;j.nodes[0].output.authority='PAYMENT_EXECUTED';});const r=await run(f,f.customer,'ai-critic',{targetWorkflowId:source.id});const codes=r.nodes[0].output.findings.map(x=>x.code);for(const code of ['MISSING_PROVENANCE','INVALID_CONFIDENCE','AUTHORITY_OVERCLAIM'])assert(codes.includes(code));
});
test('failed results requesting confirmation remain failures and block dependents',async()=>{
 let called=false;const orchestrator=new JourneyOrchestrator({registry:{bad:{execute:async()=>({status:'FAILED',data:{},requires_confirmation:true,error:{code:'FAILED_TEST'}})},later:{execute:async()=>{called=true;return {status:'SUCCESS',data:{}};}}}});
 const j=await orchestrator.run({id:'failure-confirmation',nodes:[{node_id:'bad',responsible_agent:'bad'},{node_id:'later',responsible_agent:'later',dependencies:['bad']}]});assert.equal(j.nodes[0].status,'FAILED');assert.equal(j.nodes[1].status,'BLOCKED');assert.equal(called,false);
});
test('quality evidence HTTP endpoint requires admin and rejects unknown rules',async t=>{
 const f=fixture(t);for(const id of ['admin','customer'])f.app.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(id).digest('hex'),id,Date.now()+60000);await new Promise(r=>f.app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+f.app.server.address().port;
 for(const [id,status] of [[null,401],['customer',403],['admin',200]]){const response=await fetch(base+'/api/admin/quality/evidence',{method:'POST',headers:{'Content-Type':'application/json',...(id?{Cookie:'r2v_session='+id}:{})},body:JSON.stringify({rule:'missing_payment'})});assert.equal(response.status,status);}
});
test('critic reports malformed nested records without failing its review',async t=>{
 const f=fixture(t),source=await run(f,f.customer,'property-advice');mutate(f,source.id,j=>{const n=j.nodes.find(n=>n.responsible_agent==='property-agent');n.output.properties=[null];});const r=await run(f,f.customer,'ai-critic',{targetWorkflowId:source.id});assert(r.nodes[0].output.findings.some(x=>x.code==='MALFORMED_RECORD'));
});
