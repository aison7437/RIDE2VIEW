const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
const {createApp}=require('../server/app');
const options={startOperationsRuntime:false,startSideEffectRuntime:false,startPaymentInitiationRuntime:false,startProviderCallbackRuntime:false};
function user(db,id,role='customer'){db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,id+'@test.example',id,'unused',role);return {id,role};}
function setup(t){const dir=mkdtempSync(join(tmpdir(),'r2v-agents-')),path=join(dir,'test.sqlite');let app=createApp({...options,dbPath:path});t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});const customer=user(app.db,'customer'),other=user(app.db,'other'),agent=user(app.db,'agent','agent'),driver=user(app.db,'driver','driver'),admin=user(app.db,'admin','admin');return {get app(){return app;},customer,other,agent,driver,admin,restart:async()=>{await app.close();app=createApp({...options,dbPath:path});}};}
function property(f){const {app,admin}=f;const p=app.supply.createListing(admin,{title:'Synthetic Nairobi home',description:'Test only property',price:45000,transactionType:'rent',location:{city:'Nairobi'},property:{bedrooms:2}});app.db.prepare('UPDATE listings SET approved=1 WHERE id=?').run(p.id);app.db.prepare("UPDATE supply_checks SET status='APPROVED',expires_at=? WHERE target_id=?").run(new Date(Date.now()+86400000).toISOString(),p.id);return p;}
function req(workflow,extra={}){return {workflow,idempotencyKey:require('node:crypto').randomUUID(),...extra};}
test('published property assessment persists, resumes with identity intact and never books',async t=>{
 const f=setup(t),p=property(f);f.app.supply.profile(f.customer,{city:'Nairobi',goal:'rent',budget:50000,bedrooms:2});
 f.app.supply.addSlot(f.admin,p.id,{startAt:new Date(Date.now()+3600000).toISOString(),endAt:new Date(Date.now()+5400000).toISOString()});
 const run=await f.app.agentWorkflows.create(f.customer,req('property-advice',{listingId:p.id}));assert.equal(run.status,'REVIEW_REQUIRED');
 assert.equal(run.nodes.find(n=>n.agent==='lead-qualification-agent').output.assessments[0].status,'MATCHED');
 assert.equal(run.nodes.find(n=>n.agent==='scheduling-agent').status,'WAITING_CONFIRMATION');
 assert.equal(f.app.db.prepare('SELECT count(*) n FROM bookings').get().n,0);
 await f.restart();assert.equal(f.app.agentWorkflows.get(f.customer,run.id).id,run.id);
 const reviewed=f.app.agentWorkflows.review(f.customer,run.id,{version:run.version,decision:'REVIEWED'});assert.equal(reviewed.status,'REVIEWED');assert.equal(f.app.db.prepare('SELECT count(*) n FROM bookings').get().n,0);
 assert.throws(()=>f.app.agentWorkflows.get(f.other,run.id),/not found/);assert.throws(()=>f.app.agentWorkflows.get(f.admin,run.id),/not found/);
});
test('payload-bound retries, concurrent submissions and role restrictions',async t=>{
 const f=setup(t),body=req('driver-coach');
 const [a,b]=await Promise.all([f.app.agentWorkflows.create(f.driver,body),f.app.agentWorkflows.create(f.driver,body)]);assert.equal(a.id,b.id);assert.equal(f.app.db.prepare('SELECT count(*) n FROM agent_workflows').get().n,1);
 await assert.rejects(f.app.agentWorkflows.create(f.customer,body),/not available/);
 const c=req('property-advice');await f.app.agentWorkflows.create(f.customer,c);await assert.rejects(f.app.agentWorkflows.create(f.customer,{...c,workflow:'opportunities'}),/different input/);
 await assert.rejects(f.app.agentWorkflows.create(f.customer,req('property-advice',{properties:[{id:'spoof'}]})),/Unexpected/);
 await assert.rejects(f.app.agentWorkflows.create(null,req('property-advice')),/Sign in/);
});
test('expired leases recover saved work after restart without repeating completed nodes',async t=>{
 const f=setup(t);const r=await f.app.agentWorkflows.create(f.driver,req('driver-coach'));
 const row=f.app.db.prepare('SELECT journey FROM agent_workflows WHERE id=?').get(r.id),j=JSON.parse(row.journey);j.nodes[0].status='RUNNING';j.nodes[0].output=null;
 f.app.db.prepare("UPDATE agent_workflows SET journey=?,status='RUNNING',lease_token='abandoned',lease_until=0 WHERE id=?").run(JSON.stringify(j),r.id);
 await f.restart();assert.equal(f.app.agentWorkflows.get(f.driver,r.id).status,'RECOVERABLE');
 const next=await f.app.agentWorkflows.execute(f.driver,r.id);assert.equal(next.status,'REVIEW_REQUIRED');assert.equal(next.nodes[0].attempts,2);assert.equal(next.id,r.id);
 const repeat=await f.app.agentWorkflows.execute(f.driver,r.id);assert.equal(repeat.nodes[0].attempts,2);
});
test('active worker cannot be stolen and lost lease cannot publish stale results',async t=>{
 const f=setup(t),running=f.app.agentWorkflows.create(f.driver,req('driver-coach'));
 const row=f.app.db.prepare('SELECT * FROM agent_workflows').get();assert.equal(row.status,'RUNNING');
 const duplicate=await f.app.agentWorkflows.execute(f.driver,row.id);assert.equal(duplicate.status,'RUNNING');
 f.app.db.prepare("UPDATE agent_workflows SET lease_token='new-owner',lease_until=? WHERE id=?").run(Date.now()+60000,row.id);
 await assert.rejects(running,/lease lost/);assert.equal(f.app.db.prepare('SELECT lease_token FROM agent_workflows WHERE id=?').get(row.id).lease_token,'new-owner');
});
test('expired and stale reviews cannot approve changed snapshots',async t=>{
 const f=setup(t),r=await f.app.agentWorkflows.create(f.driver,req('driver-coach'));
 assert.throws(()=>f.app.agentWorkflows.review(f.driver,r.id,{version:r.version-1,decision:'REVIEWED'}),/changed/);
 f.app.db.prepare("UPDATE agent_workflows SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(r.id);
 assert.equal(f.app.agentWorkflows.get(f.driver,r.id).status,'EXPIRED');assert.throws(()=>f.app.agentWorkflows.review(f.driver,r.id,{version:r.version,decision:'REVIEWED'}),/expired/);await assert.rejects(f.app.agentWorkflows.execute(f.driver,r.id),/expired/);
});
test('agent and driver assistance contain only their own records',async t=>{
 const f=setup(t);for(const kind of ['identity','agency'])f.app.db.prepare("INSERT INTO supply_checks(kind,target_id,status,expires_at,updated_at) VALUES(?,?,'APPROVED',?,?)").run(kind,f.agent.id,new Date(Date.now()+86400000).toISOString(),new Date().toISOString());f.app.supply.createListing(f.agent,{title:'Own draft',description:'Own test property',price:1000,location:{city:'Nairobi'},property:{bedrooms:1}});property(f);
 const a=await f.app.agentWorkflows.create(f.agent,req('agent-assistant'));assert.match(a.nodes[0].output.summary,/1 properties/);
 f.app.marketplace.earn(f.admin,{beneficiaryId:f.driver.id,beneficiaryRole:'driver',sourceKind:'test',sourceId:'one',grossAmount:650,platformAmount:300,beneficiaryAmount:350,evidenceRef:'synthetic'});
 const d=await f.app.agentWorkflows.create(f.driver,req('driver-coach'));assert.equal(d.nodes[0].output.earnings.recorded,350);assert.equal(d.nodes[0].output.earnings.paid,0);assert.match(JSON.stringify(d),/not connected/);assert(!JSON.stringify(d).includes('Own draft'));
});
test('booking advice uses recorded amount rather than static tier price and does not expose other accounts',async t=>{
 const f=setup(t),p=property(f),time=new Date().toISOString();f.app.db.prepare("INSERT INTO bookings VALUES('b',?,?,'general',913,'requested',?,NULL,?)").run(f.customer.id,p.id,time,time);f.app.db.prepare("INSERT INTO payments VALUES('p','b',913,'pending',NULL,NULL,NULL)").run();
 const r=await f.app.agentWorkflows.create(f.customer,req('booking-review',{bookingId:'b'}));assert.equal(r.nodes[0].output.amount,913);assert.equal(f.app.db.prepare("SELECT status FROM payments WHERE id='p'").get().status,'pending');assert(!r.nodes.some(n=>n.agent==='mobility-agent'));
 await assert.rejects(f.app.agentWorkflows.create(f.other,req('booking-review',{bookingId:'b'})),/not found/);
 const admin=await f.app.agentWorkflows.create(f.admin,req('booking-review',{bookingId:'b'}));assert.equal(admin.nodes.find(n=>n.agent==='mobility-agent').failure.code,'NO_DRIVER_AVAILABLE');
});
test('commerce, shipment, opportunity and unavailable experiences use bounded authoritative sources',async t=>{
 const f=setup(t),p=property(f);f.app.supply.profile(f.customer,{city:'Nairobi',budget:50000,goal:'rent'});
 const opportunity=await f.app.agentWorkflows.create(f.customer,req('opportunities'));assert.equal(opportunity.nodes[0].output.opportunities[0].id,p.id);
 f.app.expansion.merchant(f.agent,{businessName:'Test merchant'});f.app.expansion.verifyMerchant(f.admin,f.agent.id);f.app.expansion.item(f.agent,{sku:'a',title:'Test meal',category:'food',quantity:2,unitPrice:125});
 const commerce=await f.app.agentWorkflows.create(f.customer,req('commerce-advice',{category:'food'}));assert.equal(commerce.nodes[0].output.authoritative_total,125);assert.equal(f.app.db.prepare('SELECT count(*) n FROM commerce_orders').get().n,0);
 const shipment=f.app.fulfillment.create({customerId:f.customer.id,shipmentClass:'SMALL_PARCEL',weightKg:1,pickup:{},destination:{},idempotencyKey:'test-shipment',actor:f.customer});
 const logistics=await f.app.agentWorkflows.create(f.customer,req('shipment-advice',{shipmentId:shipment.id}));assert.equal(logistics.nodes[0].status,'WAITING_CONFIRMATION');
 await assert.rejects(f.app.agentWorkflows.create(f.other,req('shipment-advice',{shipmentId:shipment.id})),/not found/);
 const experience=await f.app.agentWorkflows.create(f.customer,req('experiences'));assert.equal(experience.status,'PARTIAL');assert.equal(experience.nodes[0].failure.code,'NO_CONFIRMED_EXPERIENCES');
});
test('qualification handles purchase listings and missing preferences without credit claims',async()=>{
 const {execute}=require('../ai/user/lead-qualification-agent');const properties=[{id:'sale',price:1000,transactionType:'sale',location:{city:'Nairobi'},property:{bedrooms:2}}];
 const good=await execute({input:{preferences:{city:'Nairobi',budget:1000,goal:'buy'},properties}});assert.equal(good.data.assessments[0].status,'MATCHED');
 const missing=await execute({input:{preferences:{},properties}});assert.equal(missing.data.assessments[0].status,'NEEDS_PROFILE');
});
test('HTTP workflow boundary authenticates users and restricts cross-account reads and reviews',async t=>{
 const f=setup(t),{createHash}=require('node:crypto');for(const u of [f.customer,f.other])f.app.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(u.id).digest('hex'),u.id,Date.now()+60000);
 await new Promise(r=>f.app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+f.app.server.address().port;
 async function call(path,method='GET',body,cookie){const r=await fetch(base+'/api'+path,{method,headers:{...(cookie?{Cookie:'r2v_session='+cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 assert.equal((await call('/agents/workflows')).status,401);
 const created=await call('/agents/workflows','POST',req('property-advice'),f.customer.id);assert.equal(created.status,201);
 assert.equal((await call('/agents/workflows/'+created.data.id,'GET',null,f.other.id)).status,404);
 assert.equal((await call('/agents/workflows/'+created.data.id+'/review','POST',{version:created.data.version,decision:'REVIEWED'},f.other.id)).status,404);
 assert.equal((await call('/agents/workflows','GET',null,f.other.id)).data.workflows.length,0);
 assert.equal((await call('/agents/workflows','POST',req('driver-coach'),f.customer.id)).status,403);
});
