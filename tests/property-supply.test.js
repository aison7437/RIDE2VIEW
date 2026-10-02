const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
const {createApp}=require('../server/app');
const {approveAgent,publishProperty,approveCheck,customerProfile,createSlot,pdf,expiry}=require('./helpers/supply.cjs');
async function fixture(t,options={}){
 const dir=mkdtempSync(join(tmpdir(),'r2v-supply-')),dbPath=join(dir,'db.sqlite');
 let app=createApp({dbPath,adminEmail:'admin@example.test',adminPassword:'Administrator-Test-Only-42',startSideEffectRuntime:false,startPaymentInitiationRuntime:false,startProviderCallbackRuntime:false,...options});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 async function call(path,method='GET',body,cookie,expected=200){const r=await fetch(base+'/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 async function account(email,role){const d={email,role,name:'Test '+role,password:'Test-Password-123456'};const r=await call('/auth/register','POST',d,null,201),login=await call('/auth/login','POST',d);return {id:r.data.id,cookie:login.cookie};}
 const admin=(await call('/auth/login','POST',{email:'admin@example.test',password:'Administrator-Test-Only-42'})).cookie;
 const agent=await account('agent@example.test','agent'),otherAgent=await account('other-agent@example.test','agent'),customer=await account('customer@example.test','customer'),other=await account('other@example.test','customer');
 await approveAgent(call,agent,admin);await customerProfile(call,customer.cookie);await customerProfile(call,other.cookie);
 const listing=(await call('/listings','POST',{title:'Nairobi apartment',description:'Supply test property',price:45000,location:{city:'Nairobi'},property:{bedrooms:2}},agent.cookie,201)).data;
 async function publish(){await publishProperty(call,listing.id,agent.cookie,admin);}
 async function request(days=1,cookie=customer.cookie,key='request-'+days){const slot=await createSlot(call,listing.id,agent.cookie,days);const body={listingId:listing.id,slotId:slot.id,idempotencyKey:key,tier:'general'};const v=(await call('/viewing-requests','POST',body,cookie,201)).data;return {slot,body,v};}
 async function accepted(days=1){const {slot,body,v}=await request(days);const a=(await call('/viewing-requests/'+v.id+'/accept','POST',{},agent.cookie)).data;return {...a,slot,body,v};}
 async function restart(){await app.close();app=createApp({dbPath,startSideEffectRuntime:false});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;}
 return {get app(){return app;},get base(){return base;},call,account,admin,agent,otherAgent,customer,other,listing,publish,request,accepted,restart};
}
test('document privacy, evidence ownership, role restrictions and stale reviews',async t=>{
 const f=await fixture(t),{call,agent,otherAgent,customer,admin,listing}=f;
 await call('/agent/dashboard','GET',undefined,customer.cookie,403);await call('/admin/supply-reviews','GET',undefined,agent.cookie,403);
 const d=(await call('/supply/documents','POST',{kind:'marketing',name:'mandate.pdf',mime:'application/pdf',data:pdf},agent.cookie,201)).data;
 for(const [cookie,status]of [[undefined,401],[otherAgent.cookie,403],[customer.cookie,403]]){const r=await fetch(f.base+'/api/supply/documents/'+d.id,{headers:cookie?{Cookie:cookie}:{}});assert.equal(r.status,status);}
 const downloaded=await fetch(f.base+'/api/supply/documents/'+d.id,{headers:{Cookie:admin}});assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('content-type'),'application/pdf');assert(downloaded.headers.get('content-disposition').startsWith('attachment'));assert.equal(Buffer.from(await downloaded.arrayBuffer()).toString(),Buffer.from(pdf,'base64').toString());
 await call('/supply/checks/marketing/'+listing.id+'/submit','POST',{documentIds:[d.id]},otherAgent.cookie,403);
 await call('/supply/checks/ownership/'+listing.id+'/submit','POST',{documentIds:[d.id]},agent.cookie,403);
 await call('/supply/documents','POST',{kind:'identity',name:'evil.pdf',mime:'application/pdf',data:Buffer.from('<html>not a PDF</html>').toString('base64')},agent.cookie,400);
 const pending=(await call('/supply/checks/marketing/'+listing.id+'/submit','POST',{documentIds:[d.id]},agent.cookie)).data;
 await call('/admin/supply-reviews/marketing/'+listing.id,'POST',{decision:'APPROVED',reason:'Checked',revision:pending.revision,expiresAt:expiry()},agent.cookie,403);
 await call('/listings/'+listing.id,'PATCH',{description:'Updated description'},agent.cookie);
 await call('/admin/supply-reviews/marketing/'+listing.id,'POST',{decision:'APPROVED',reason:'Checked',revision:pending.revision,expiresAt:expiry()},admin,409);
 await call('/listings/'+listing.id,'PATCH',{price:1},otherAgent.cookie,403);
 await call('/listings','POST',{title:'Customer listing'},customer.cookie,403);
 assert.equal((await call('/listings')).data.listings.length,0);
});
test('publication requires separate checks, edits invalidate evidence and expiry hides supply',async t=>{
 const f=await fixture(t),{call,agent,admin,listing}=f;
 await call('/listings/'+listing.id,'PATCH',{approved:true},admin,409);
 await call('/supply/checks/publication/'+listing.id+'/submit','POST',{},agent.cookie,409);
 await f.publish();assert.equal((await call('/listings')).data.listings.length,1);
 const publicData=JSON.stringify((await call('/listings')).data);assert(!publicData.includes('documentIds'));assert(!publicData.includes(pdf));assert(!publicData.includes('evidence_ref'));
 await call('/properties/'+listing.id+'/media','POST',{kind:'photo',url:'javascript:alert(1)'},agent.cookie,400);
 await call('/properties/'+listing.id+'/media','POST',{kind:'tour360',url:'https://example.test/tour',caption:'360 tour'},agent.cookie,201);
 assert.equal((await call('/listings')).data.listings.length,0);
 await approveCheck(call,'publication',listing.id,agent.cookie,admin);assert.equal((await call('/listings')).data.listings[0].media[0].kind,'tour360');
 f.app.db.prepare("UPDATE supply_checks SET expires_at='2000-01-01T00:00:00.000Z' WHERE kind='identity' AND target_id=?").run(agent.id);
 assert.equal((await call('/listings')).data.listings.length,0);
 assert.equal((await call('/search','POST',{message:'Find a Nairobi property'})).data.recommendations.length,0);
 await call('/properties/'+listing.id+'/slots','GET',undefined,f.customer.cookie,404);
});
test('qualified request idempotency, acceptance atomicity and agent calendar conflicts',async t=>{
 const f=await fixture(t),{call,agent,otherAgent,customer,other,listing}=f;await f.publish();
 const {body,v}=await f.request();assert.equal(v.booking_id,null);assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM payments').get().n,0);
 assert.equal((await call('/viewing-requests','POST',body,customer.cookie)).data.duplicate,true);
 await call('/viewing-requests','POST',{...body,tier:'vip'},customer.cookie,409);await call('/viewing-requests','POST',body,other.cookie,409);
 await call('/viewing-requests/'+v.id+'/accept','POST',{},customer.cookie,403);await call('/viewing-requests/'+v.id+'/accept','POST',{},otherAgent.cookie,403);
 f.app.db.exec("CREATE TRIGGER fail_accept BEFORE INSERT ON payments BEGIN SELECT RAISE(ABORT,'injected_accept_failure'); END");
 await call('/viewing-requests/'+v.id+'/accept','POST',{},agent.cookie,500);assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n,0);assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM reservations').get().n,0);assert.equal(f.app.db.prepare('SELECT status FROM viewing_requests WHERE id=?').get(v.id).status,'REQUESTED');
 f.app.db.exec('DROP TRIGGER fail_accept');const accepted=(await call('/viewing-requests/'+v.id+'/accept','POST',{},agent.cookie)).data;
 assert.equal(accepted.amount,650);assert.equal((await call('/viewing-requests/'+v.id+'/accept','POST',{},agent.cookie)).data.duplicate,true);assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM payments').get().n,1);
 const second=(await call('/listings','POST',{title:'Second property',price:40000,location:{city:'Nairobi'},property:{bedrooms:1}},agent.cookie,201)).data;await publishProperty(call,second.id,agent.cookie,f.admin);
 const slot=(await call('/properties/'+second.id+'/slots','POST',{startAt:accepted.slot?.start_at||(await call('/viewing-requests','GET',undefined,agent.cookie)).data.viewings[0].start_at,endAt:(await call('/viewing-requests','GET',undefined,agent.cookie)).data.viewings[0].end_at},agent.cookie,201)).data;
 const conflicting=(await call('/viewing-requests','POST',{listingId:second.id,slotId:slot.id,idempotencyKey:'conflict'},other.cookie,201)).data;await call('/viewing-requests/'+conflicting.id+'/accept','POST',{},agent.cookie,409);
 assert.equal((await call('/viewing-requests','GET',undefined,other.cookie)).data.viewings.length,1);
 const qualifications=(await call('/viewing-requests','GET',undefined,customer.cookie)).data.viewings[0].qualification;assert.equal(qualifications.status,'QUALIFIED');assert.equal(qualifications.preferences.budget,50000);
});
test('rescheduling, cancellation, lead ownership and immutable outcome persist',async t=>{
 const f=await fixture(t),{call,agent,admin,customer,other}=f;await f.publish();const a=await f.accepted();
 await call('/agent/leads/'+a.v.id,'PATCH',{stage:'WON',notes:'Agreement'},agent.cookie,409);
 const second=await createSlot(call,f.listing.id,agent.cookie,2);await call('/viewing-requests/'+a.v.id+'/reschedule','POST',{slotId:second.id},other.cookie,403);
 await call('/viewing-requests/'+a.v.id+'/reschedule','POST',{slotId:second.id},agent.cookie);
 assert.equal(f.app.db.prepare('SELECT scheduled_at FROM bookings WHERE id=?').get(a.booking_id).scheduled_at,second.start_at);
 await call('/payments/'+a.paymentId+'/verify','POST',{reference:'SUPPLY_PAID_001',amount:650},admin);
 assert.equal(f.app.db.prepare('SELECT status FROM reservations WHERE id=?').get(a.reservationId).status,'CONFIRMED');
 await call('/viewing-requests/'+a.v.id+'/outcome','POST',{outcome:'INTERESTED'},customer.cookie,409);
 await call('/viewing-requests/'+a.v.id+'/cancel','POST',{reason:'Customer change'},other.cookie,403);
 await call('/viewing-requests/'+a.v.id+'/cancel','POST',{reason:'Customer change'},agent.cookie);
 assert.equal((await call('/viewing-requests','GET',undefined,customer.cookie)).data.viewings[0].status,'CANCELLED');assert.equal(f.app.db.prepare('SELECT status FROM payments WHERE id=?').get(a.paymentId).status,'refund_pending');
 const b=await f.accepted(3);await call('/payments/'+b.paymentId+'/verify','POST',{reference:'SUPPLY_PAID_002',amount:650},admin);
 // Simulate the existing dispatch authority's completed booking outcome, exercised fully by journey/browser suites.
 f.app.db.prepare("UPDATE bookings SET status='completed' WHERE id=?").run(b.booking_id);
 await call('/viewing-requests/'+b.v.id+'/cancel','POST',{reason:'Too late'},agent.cookie,409);
 await call('/viewing-requests/'+b.v.id+'/outcome','POST',{outcome:'INTERESTED',notes:'Proceed with offer'},customer.cookie);
 assert.equal((await call('/viewing-requests/'+b.v.id+'/outcome','POST',{outcome:'INTERESTED',notes:'Proceed with offer'},agent.cookie)).data.duplicate,true);
 await call('/viewing-requests/'+b.v.id+'/outcome','POST',{outcome:'NOT_INTERESTED'},agent.cookie,409);
 await call('/agent/leads/'+b.v.id,'PATCH',{stage:'WON',notes:'Signed agreement TEST-AGREEMENT-1'},agent.cookie);
 await f.restart();const dash=(await call('/agent/dashboard','GET',undefined,agent.cookie)).data;assert.equal(dash.performance.won,1);assert.equal(dash.performance.completed,1);assert(dash.leads.some(l=>l.stage==='WON'));
});
test('expired payment holds release slots and cannot capture manual payment',async t=>{
 const f=await fixture(t);await f.publish();const a=await f.accepted();f.app.db.prepare("UPDATE reservations SET hold_expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(a.reservationId);
 await f.call('/payments/'+a.paymentId+'/verify','POST',{reference:'EXPIRED_PAYMENT',amount:650},f.admin,409);
 assert.equal(f.app.db.prepare('SELECT status FROM payments WHERE id=?').get(a.paymentId).status,'pending');assert.equal(f.app.db.prepare("SELECT reference FROM payment_references WHERE reference='EXPIRED_PAYMENT'").get(),undefined);
 assert.equal((await f.call('/viewing-requests','GET',undefined,f.customer.cookie)).data.viewings[0].status,'EXPIRED');
 await f.call('/viewing-requests','POST',{...a.body,idempotencyKey:'new-customer-request'},f.other.cookie,201);
});
test('customer qualification and saved properties are scoped to the customer',async t=>{
 const f=await fixture(t);await f.publish();await f.call('/customer/saved-properties/'+f.listing.id,'PUT',{},f.customer.cookie);
 assert.equal((await f.call('/customer/saved-properties','GET',undefined,f.other.cookie)).data.properties.length,0);
 await f.call('/customer/profile','PUT',{city:'Nairobi',budget:100,goal:'rent'},f.customer.cookie);
 const slot=await createSlot(f.call,f.listing.id,f.agent.cookie);
 await f.call('/viewing-requests','POST',{listingId:f.listing.id,slotId:slot.id,idempotencyKey:'not-qualified'},f.customer.cookie,409);
 await f.call('/customer/profile','PUT',{city:'Nairobi',budget:50000,goal:'buy'},f.customer.cookie);
 await f.call('/viewing-requests','POST',{listingId:f.listing.id,slotId:slot.id,idempotencyKey:'wrong-goal'},f.customer.cookie,409);
 await f.call('/customer/saved-properties/'+f.listing.id,'DELETE',{},f.customer.cookie);assert.equal((await f.call('/customer/saved-properties','GET',undefined,f.customer.cookie)).data.properties.length,0);
});
test('commission payout records use shared reference authority and completion-bound reviews',async t=>{
 const f=await fixture(t);await f.publish();const a=await f.accepted();
 await f.call('/viewing-requests/'+a.v.id+'/review','POST',{rating:5,comment:'Good agent'},f.customer.cookie,409);
 await f.call('/payments/'+a.paymentId+'/verify','POST',{reference:'COMMISSION_VIEWING_RECEIPT',amount:650},f.admin);
 f.app.db.prepare("UPDATE bookings SET status='completed' WHERE id=?").run(a.booking_id);
 await f.call('/viewing-requests/'+a.v.id+'/review','POST',{rating:5,comment:'Good agent'},f.other.cookie,403);
 await f.call('/viewing-requests/'+a.v.id+'/review','POST',{rating:5,comment:'Good agent'},f.customer.cookie,201);
 await f.call('/viewing-requests/'+a.v.id+'/review','POST',{rating:1},f.customer.cookie,409);
 await f.call('/agent/leads/'+a.v.id,'PATCH',{stage:'WON',notes:'Signed rental agreement AGREEMENT-001'},f.agent.cookie);
 const c=(await f.call('/admin/commissions/requests/'+a.v.id,'POST',{amount:10000,evidenceRef:'Agreement COMMISSION-001'},f.admin,201)).data;
 await f.call('/admin/commissions/'+c.id,'PATCH',{status:'PAID',evidenceRef:'Bank record',paymentReference:'PAYOUT001'},f.admin,409);
 await f.call('/admin/commissions/'+c.id,'PATCH',{status:'PENDING',evidenceRef:'Approved payout'},f.agent.cookie,403);
 await f.call('/admin/commissions/'+c.id,'PATCH',{status:'PENDING',evidenceRef:'Approved payout'},f.admin);
 await f.call('/admin/commissions/'+c.id,'PATCH',{status:'PAID',evidenceRef:'Bank record',paymentReference:'COMMISSION_VIEWING_RECEIPT'},f.admin,409);
 await f.call('/admin/commissions/'+c.id,'PATCH',{status:'PAID',evidenceRef:'Bank record PAYOUT-001',paymentReference:'PAYOUT001'},f.admin);
 assert.equal(f.app.db.prepare("SELECT amount,direction FROM financial_ledger_events WHERE kind='agent_commission'").get().amount,10000);
 assert.equal(f.app.db.prepare("SELECT COUNT(*) AS n FROM reconciliation_records r JOIN financial_ledger_events l ON l.id=r.ledger_event_id WHERE l.kind='agent_commission'").get().n,1);
 assert.equal((await f.call('/agent/commissions','GET',undefined,f.otherAgent.cookie)).data.commissions.length,0);
 await f.call('/admin/commissions/'+c.id,'PATCH',{status:'DISPUTED',evidenceRef:'Attempted overwrite'},f.admin,409);
 assert.equal((await f.call('/agent/dashboard','GET',undefined,f.agent.cookie)).data.reviews[0].rating,5);
});
test('provider payment and managed reservation commit or roll back together',async t=>{
 const provider={verifySignature:()=>true,parseEvent:({rawBody})=>JSON.parse(rawBody),initiatePayment:()=>({providerRequestId:'test-request'})};
 const f=await fixture(t,{paymentProviders:{test:provider}});await f.publish();const a=await f.accepted();
 const intent=f.app.paymentIntentAuthority.create({paymentKind:'booking_payment',paymentId:a.paymentId,provider:'test',customerContact:'+254700000000',idempotencyKey:'provider-test'});
 const rawBody=JSON.stringify({providerEventId:'test-event',correlationId:intent.correlation_id,paymentKind:'booking_payment',paymentId:a.paymentId,type:'PAYMENT_SUCCEEDED',reference:'PROVIDER_SUPPLY_001',amount:650,currency:'KES'});
 const inbox=f.app.providerBoundary.receive({provider:'test',rawBody,signature:'test'});
 f.app.db.exec("CREATE TRIGGER fail_supply_confirm BEFORE UPDATE ON reservations WHEN NEW.status='CONFIRMED' BEGIN SELECT RAISE(ABORT,'injected_confirm_failure'); END");
 assert.throws(()=>f.app.providerBoundary.process({inboxId:inbox.id}));assert.equal(f.app.db.prepare('SELECT status FROM payments WHERE id=?').get(a.paymentId).status,'pending');assert.equal(f.app.db.prepare('SELECT status FROM reservations WHERE id=?').get(a.reservationId).status,'HOLD_CREATED');assert.equal(f.app.db.prepare('SELECT status FROM payment_intents WHERE id=?').get(intent.id).status,'PENDING_INITIATION');assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM provider_payment_events').get().n,0);
 f.app.db.exec('DROP TRIGGER fail_supply_confirm');f.app.providerBoundary.process({inboxId:inbox.id});assert.equal(f.app.db.prepare('SELECT status FROM reservations WHERE id=?').get(a.reservationId).status,'CONFIRMED');assert.equal(f.app.db.prepare('SELECT status FROM payments WHERE id=?').get(a.paymentId).status,'paid');assert.equal(f.app.db.prepare('SELECT status FROM payment_intents WHERE id=?').get(intent.id).status,'CONFIRMED');assert.equal(f.app.db.prepare('SELECT status FROM provider_callback_inbox WHERE id=?').get(inbox.id).status,'PROCESSED');
});
