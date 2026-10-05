const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {createApp}=require('../server/app');
const {period}=require('../server/analytics/authority');
const {createLedgerAuthority}=require('../server/payments/ledger/ledger-authority');
function setup(t){const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false});t.after(()=>app.close());const users={};for(const role of ['admin','agent','customer','driver']){const id=role;app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,id+'@test.example',id,'unused',role);users[role]={id,role};}app.db.prepare('INSERT INTO listings VALUES(?,?,?,0,1)').run('listing','agent',JSON.stringify({title:'Test',price:1000,location:{city:'Nairobi'},property:{bedrooms:1}}));return {app,...users};}
const daysAgo=n=>new Date(Date.now()-n*86400000).toISOString();
function viewing(f,id,{created=daysAgo(2),requestStatus='ACCEPTED',bookingStatus='completed',amount=650,paymentStatus='paid'}={}){const {db}=f.app;db.prepare('INSERT INTO property_slots VALUES(?,?,?,?,1,?)').run(id,'listing',new Date(Date.now()+2*86400000+db.prepare('SELECT count(*) n FROM property_slots').get().n*3600000).toISOString(),daysAgo(-3),created);const booking=requestStatus==='REQUESTED'||requestStatus==='DECLINED'?null:id;if(booking){db.prepare('INSERT INTO bookings VALUES(?,?,?,?,?,?,?,?,?)').run(id,'customer','listing','general',amount,bookingStatus,daysAgo(-2),'driver',created);db.prepare('INSERT INTO payments VALUES(?,?,?,?,NULL,NULL,?)').run(id,id,amount,paymentStatus,created);}db.prepare('INSERT INTO viewing_requests VALUES(?,?,?,?,?,?,?, ?,NULL,?,?)').run(id,'customer','listing',id,'general',requestStatus,booking,id,created,created);}
test('date ranges are Nairobi calendar dates, inclusive at the end, strict and bounded',()=>{
 const p=period({from:'2026-10-01',to:'2026-10-01'},Date.parse('2026-10-05T00:00:00Z'));assert.equal(p.start,'2026-09-30T21:00:00.000Z');assert.equal(p.end,'2026-10-01T21:00:00.000Z');
 for(const input of [{from:'2026-02-30'},{from:'bad'},{from:'2026-10-06',to:'2026-10-05'},{from:'2024-01-01',to:'2026-10-05'},{to:'2099-01-01'}])assert.throws(()=>period(input),/date|range/);
});
test('viewing denominators, conversion and package transport counts use distinct domain records',async t=>{
 const f=setup(t);viewing(f,'one');viewing(f,'two');viewing(f,'waiting',{requestStatus:'REQUESTED'});viewing(f,'declined',{requestStatus:'DECLINED'});
 f.app.db.prepare("INSERT INTO viewing_journeys VALUES('j','customer','COMPLETED',1,'{}',NULL,NULL,'one',0,'package',?,?)").run(daysAgo(2),daysAgo(2));
 for(const [pos,id] of [[0,'one'],[1,'two']])f.app.db.prepare('INSERT INTO journey_stops VALUES(?,?,?,?,?)').run('j',pos,id,id,'COMPLETED');
 const run=await f.app.agentWorkflows.create(f.admin,{workflow:'operations-intelligence',idempotencyKey:'analytics-test'});const b=run.nodes[0].output;assert.equal(b.counts.viewings,4);assert.equal(b.counts.accepted,2);assert.equal(b.counts.completed,2);assert.equal(b.counts.completed_transport,1);assert.equal(b.conversion.requestToCompleted.percent,50);assert.equal(b.performance.drivers[0].completed,1);assert.equal(b.performance.agents[0].requests,4);assert.equal(b.counts.stalled_requests,1);assert.equal(f.app.db.prepare('SELECT count(*) n FROM bookings').get().n,2);
});
test('ledger currencies and allocations remain separate; refunds are debits, not reductions to gross allocations',t=>{
 const f=setup(t),ledger=createLedgerAuthority({db:f.app.db});
 for(const [id,currency,direction,amount,eventType] of [['a','KES','CREDIT',1000,'PAYMENT_CAPTURED'],['b','KES','DEBIT',200,'REFUND_SETTLED'],['c','USD','CREDIT',10,'PAYMENT_CAPTURED']])ledger.record({eventType,kind:'test',entityId:id,reference:id,amount,currency,direction,actor:f.admin});
 f.app.marketplace.earn(f.admin,{beneficiaryId:f.driver.id,beneficiaryRole:'driver',sourceKind:'test',sourceId:'a',grossAmount:1000,platformAmount:300,beneficiaryAmount:700,evidenceRef:'test'});
 const report=f.app.analytics.snapshot(f.admin);assert.equal(report.finance.ledger.length,3);assert.equal(report.finance.allocations[0].platformAllocation,300);assert.equal(report.finance.outstanding[0].amount,700);assert.equal(report.finance.ledger.find(x=>x.currency==='USD').amount,10);
 const evidence=f.app.analytics.evidence(f.admin,{category:'ledger'});assert.equal(evidence.total,3);assert(!JSON.stringify(evidence).includes('reference'));
});
test('cohort date boundaries exclude next-day records while status remains current, and empty ratios are null',async t=>{
 const f=setup(t),p=period({from:'2026-10-01',to:'2026-10-01'});viewing(f,'start',{created:p.start});viewing(f,'end',{created:p.end});
 const r=f.app.analytics.snapshot(f.admin,{from:p.from,to:p.to});assert.equal(r.counts.viewings,1);assert.equal(r.counts.completed,1);f.app.db.prepare("UPDATE bookings SET status='cancelled' WHERE id='start'").run();assert.equal(f.app.analytics.snapshot(f.admin,{from:p.from,to:p.to}).counts.cancelled,1);
 const run=await f.app.agentWorkflows.create(f.admin,{workflow:'operations-intelligence',from:'2026-09-01',to:'2026-09-01',idempotencyKey:'empty-ratio'});assert.equal(run.nodes[0].output.conversion.requestToCompleted.percent,null);
});
test('friction thresholds identify recorded problems and clear when current source status is resolved',t=>{
 const f=setup(t);viewing(f,'paid',{bookingStatus:'confirmed'});viewing(f,'pending',{bookingStatus:'requested',paymentStatus:'pending'});
 const db=f.app.db,old=daysAgo(2);db.prepare("INSERT INTO reservations VALUES('r','customer','listing','property',?,?,'HOLD_CREATED',?,'r','[]',1,?,?)").run(old,daysAgo(-1),daysAgo(1),old,old);db.prepare("INSERT INTO booking_reservations VALUES('pending','r',?)").run(old);
 db.prepare("INSERT INTO dispatch_assignments VALUES('d','paid','driver','REJECTED',NULL,'d',1,?,?)").run(old,old);
 db.prepare("INSERT INTO support_cases(id,incident_type,severity,status,idempotency_key,created_at,updated_at) VALUES('s','PAYMENT_FAILED','HIGH','OPEN','s',?,?)").run(old,old);
 const s=f.app.analytics.snapshot(f.admin);assert.equal(s.counts.expired_holds,1);assert.equal(s.counts.dispatch_failures,1);assert.equal(s.counts.awaiting_driver,1);assert.equal(s.counts.support,1);
 db.prepare("UPDATE support_cases SET status='RESOLVED' WHERE id='s'").run();assert.equal(f.app.analytics.snapshot(f.admin).counts.support,0);assert.equal(f.app.analytics.evidence(f.admin,{category:'expired_holds'}).records[0].id,'pending');
});
test('minimal discovery tracking binds selections to the account and returned listings, deduplicates and measures late gaps honestly',t=>{
 const f=setup(t),a=f.app.analytics;assert.equal(a.recordSearch(null,[{id:'listing'}]),null);assert.equal(a.recordSearch(f.admin,[]),null);
 const searchId=a.recordSearch(f.customer,[{id:'listing',privateText:'not-stored'}]);assert.throws(()=>a.selection(f.agent,{searchId,listingId:'listing'}),/Customer/);assert.throws(()=>a.selection({id:'another',role:'customer'},{searchId,listingId:'listing'}),/not found/);assert.throws(()=>a.selection(f.customer,{searchId,listingId:'invented'}),/not returned/);
 a.selection(f.customer,{searchId,listingId:'listing'});assert.equal(a.selection(f.customer,{searchId,listingId:'listing'}).duplicate,true);
 const old=a.recordSearch(f.customer,[{id:'listing'}]);f.app.db.prepare('UPDATE discovery_search_events SET created_at=? WHERE id=?').run(daysAgo(2),old);assert.throws(()=>a.selection(f.customer,{searchId:old,listingId:'listing'}),/expired/);
 const s=a.snapshot(f.admin);assert.equal(s.counts.searches,2);assert.equal(s.counts.selected_searches,1);assert.equal(s.counts.no_selection,1);assert(!JSON.stringify(f.app.db.prepare('SELECT * FROM discovery_search_events').all()).includes('privateText'));
});
test('evidence categories cannot become SQL identifiers and pagination does not truncate totals',t=>{
 const f=setup(t);for(let i=0;i<53;i++)f.app.analytics.recordSearch(f.customer,[]);const a=f.app.analytics.evidence(f.admin,{category:'searches'}),b=f.app.analytics.evidence(f.admin,{category:'searches',offset:50});assert.equal(a.total,53);assert.equal(a.records.length,50);assert.equal(b.records.length,3);assert.throws(()=>f.app.analytics.evidence(f.admin,{category:'__proto__'}),/Unknown/);assert.throws(()=>f.app.analytics.evidence(f.admin,{category:'searches',offset:-1}),/offset/);
});
test('report and evidence HTTP APIs enforce admin role; anonymous searches do not create telemetry',async t=>{
 const f=setup(t);for(const role of ['admin','customer','driver'])f.app.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(role).digest('hex'),role,Date.now()+60000);
 await new Promise(r=>f.app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+f.app.server.address().port;
 async function post(path,body,role){const r=await fetch(base+'/api'+path,{method:'POST',headers:{'Content-Type':'application/json',...(role?{Cookie:'r2v_session='+role}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 for(const role of [null,'customer','driver'])assert.equal((await post('/admin/analytics/evidence',{category:'ledger'},role)).status,role?403:401);
 assert.equal((await post('/agents/workflows',{workflow:'operations-intelligence',idempotencyKey:'customer-report'},'customer')).status,403);
 const report=await post('/agents/workflows',{workflow:'operations-intelligence',idempotencyKey:'admin-report'},'admin');assert.equal(report.status,201);
 assert.equal((await post('/search',{message:'Nairobi house'})).data.measurementId,null);const search=await post('/search',{message:'Nairobi house'},'customer');assert.equal(typeof search.data.measurementId,'string');assert.equal(f.app.db.prepare('SELECT count(*) n FROM discovery_search_events').get().n,1);
 f.app.db.prepare("UPDATE users SET role='customer' WHERE id='admin'").run();const list=await fetch(base+'/api/agents/workflows',{headers:{Cookie:'r2v_session=admin'}});assert.equal((await list.json()).workflows.length,0);
});
