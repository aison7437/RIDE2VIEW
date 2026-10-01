const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
const {createApp}=require('../server/app');
const {enrichOpportunityReasoning,minutes}=require('../ai/user/lifestyle-agent/reasoning/reasoning-engine');
const {searchProperties}=require('../ai/Core/journey-orchestrator/search-adapter');
const {createDispatchAuthority}=require('../server/mobility/dispatch');
test('measured viewing duration and normalized input',()=>{
 assert.equal(minutes('1 hour'),60);assert.equal(minutes('1.5 hours'),90);assert.equal(minutes(0),null);
 assert.equal(enrichOpportunityReasoning({availableTime:'1 hour'},{timing:{duration:90}}).timeCompatible,false);
 assert.equal(enrichOpportunityReasoning({availableTime:'1 hour'},{timing:{duration:30}}).timeCompatible,true);
 assert.equal(enrichOpportunityReasoning({availableTime:'1 hour'},{maxViewingTime:60}).timeCompatible,null);
});
test('persistent complete journey, authorization, and payment replay protection',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'ride2view-')),dbPath=join(dir,'app.sqlite');
 let app=createApp({dbPath,adminEmail:'admin@example.test',adminPassword:'Administrator-Test-Only-42'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 async function call(path,method='GET',body,cookie,expected=200){const response=await fetch(base+'/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 async function account(email,role){const body={email,name:role+' person',role,password:'Test-Password-123456'};const registered=await call('/auth/register','POST',body,null,201);const login=await call('/auth/login','POST',body);return {id:registered.data.id,cookie:login.cookie};}
 const admin=(await call('/auth/login','POST',{email:'admin@example.test',password:'Administrator-Test-Only-42'})).cookie;
 const customer=await account('customer@example.test','customer'),other=await account('other@example.test','customer'),agent=await account('agent@example.test','agent'),driver=await account('driver@example.test','driver'),wrongDriver=await account('wrongdriver@example.test','driver');
 await call('/auth/register','POST',{email:'evil@example.test',name:'Evil User',role:'admin',password:'Test-Password-123456'},null,400);
 const listingData={title:'Kilimani 2 bedroom',description:'Available Nairobi home',price:45000,location:{city:'Nairobi'},property:{bedrooms:2},timing:{duration:45}};
 await call('/listings','POST',listingData,agent.cookie,403);
 await call('/admin/users/'+agent.id+'/approve','POST',{},admin);await call('/admin/users/'+driver.id+'/approve','POST',{},admin);
 const listing=(await call('/listings','POST',listingData,agent.cookie,201)).data;
 assert.equal((await call('/search','POST',{message:'Find a property in Nairobi',budget:50000})).data.recommendations.length,0);
 await call('/listings/'+listing.id,'PATCH',{approved:true},customer.cookie,403);await call('/listings/'+listing.id,'PATCH',{approved:true},admin);
 const search=(await call('/search','POST',{message:'Find a 2 bedroom property in Nairobi',budget:50000,availableTime:'1 hour'})).data;
 assert.equal(search.success,true);assert.equal(search.recommendations[0].id,listing.id);assert.equal(search.recommendations[0].property.bedrooms,2);
 await call('/bookings','POST',{listingId:listing.id,scheduledAt:'2000-01-01'},customer.cookie,400);
 const request={listingId:listing.id,tier:'general',scheduledAt:new Date(Date.now()+86400000).toISOString()};
 const booking=(await call('/bookings','POST',{...request,amount:1},customer.cookie,201)).data;assert.equal(booking.amount,650);assert.equal(booking.paymentStatus,'pending');
 await call('/bookings/'+booking.id+'/assign','POST',{driverId:driver.id},admin,409);
 await call('/payments/'+booking.paymentId+'/verify','POST',{reference:'RECEIPT001',amount:650},customer.cookie,403);
 await call('/payments/'+booking.paymentId+'/verify','POST',{reference:'RECEIPT001',amount:1},admin,400);
 await call('/payments/'+booking.paymentId+'/verify','POST',{reference:'RECEIPT001',amount:650},admin);
 assert.equal((await call('/payments/'+booking.paymentId+'/verify','POST',{reference:'RECEIPT001',amount:650},admin)).data.duplicate,true);
 await call('/bookings/'+booking.id+'/assign','POST',{driverId:wrongDriver.id},admin,400);
 const offer=(await call('/bookings/'+booking.id+'/assign','POST',{driverId:driver.id,idempotencyKey:'dispatch-'+booking.id},admin)).data;assert.equal(offer.status,'offered');
 const dispatchAuthority=require('../server/mobility/dispatch').createDispatchAuthority({db:app.db});dispatchAuthority.accept({assignmentId:offer.assignmentId,driverId:driver.id,actor:{id:driver.id,role:'driver'}});
 await call('/bookings/'+booking.id+'/complete','POST',{},other.cookie,403);await call('/bookings/'+booking.id+'/complete','POST',{},wrongDriver.cookie,403);await call('/bookings/'+booking.id+'/complete','POST',{},driver.cookie);
 assert.equal((await call('/bookings','GET',undefined,customer.cookie)).data.bookings[0].status,'completed');assert.equal((await call('/bookings','GET',undefined,other.cookie)).data.bookings.length,0);
 const second=(await call('/bookings','POST',request,customer.cookie,201)).data;await call('/payments/'+second.paymentId+'/verify','POST',{reference:'RECEIPT001',amount:650},admin,409);await call('/payments/'+second.paymentId+'/verify','POST',{reference:'RECEIPT002',amount:650},admin);await call('/bookings/'+second.id+'/cancel','POST',{},customer.cookie);
 assert.equal((await call('/bookings','GET',undefined,customer.cookie)).data.bookings.find(b=>b.id===second.id).payment_status,'refund_pending');
 const audit=(await call('/admin/audit','GET',undefined,admin)).data.events;assert(audit.some(e=>e.action==='payment.manually_verified'));assert(audit.some(e=>e.action==='dispatch.trip_completed'));
 await app.close();app=createApp({dbPath});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;
 assert.equal((await call('/bookings','GET',undefined,customer.cookie)).data.bookings.find(b=>b.id===booking.id).status,'completed');
 await call('/auth/logout','POST',{},customer.cookie);await call('/auth/me','GET',undefined,customer.cookie,401);
 const cross=await fetch(base+'/api/bookings',{method:'POST',headers:{Origin:'https://attacker.invalid','Content-Type':'application/json',Cookie:other.cookie},body:JSON.stringify(request)});assert.equal(cross.status,403);
 await call('/listings/'+listing.id,'PATCH',{available:false},agent.cookie);await call('/bookings','POST',request,other.cookie,409);
});

test('search adapter preserves public search recommendations contract',async()=>{
 const result=await searchProperties(
   {message:'Find a 2 bedroom property in Nairobi',budget:50000,properties:[{id:'P1',title:'Kilimani 2 bedroom',price:45000,location:{city:'Nairobi'},property:{bedrooms:2}}]},
 );
 assert.equal(result.success,true);
 assert.equal(result.recommendations[0].id,'P1');
 assert.equal(typeof result.journeyId,'string');
});
