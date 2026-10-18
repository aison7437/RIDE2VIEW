const test = require('node:test');
const assert = require('node:assert/strict');
const {mkdtempSync,rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {createApp} = require('../server/app');
const {approveAgent,publishProperty,createSlot} = require('./helpers/supply.cjs');

test('V11 customer preferences, available slot, idempotent request, agent acceptance and ownership boundary',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'r2v-v11-acceptance-'));
  const app=createApp({dbPath:join(dir,'db.sqlite'),adminEmail:'admin@example.test',adminPassword:'Administrator-Test-Only-42',startSideEffectRuntime:false,startPaymentInitiationRuntime:false,startProviderCallbackRuntime:false});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+app.server.address().port;
  t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
  async function call(path,method='GET',body,cookie,expected=200){
    const response=await fetch(base+'/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
    const data=await response.json();
    assert.equal(response.status,expected,JSON.stringify(data));
    return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  async function register(role,email){
    const credentials={role,email,name:'Acceptance '+role,password:'Test-Password-123456'};
    const created=await call('/auth/register','POST',credentials,undefined,201);
    const logged=await call('/auth/login','POST',credentials);
    return {id:created.data.id,cookie:logged.cookie};
  }
  const admin=(await call('/auth/login','POST',{email:'admin@example.test',password:'Administrator-Test-Only-42'})).cookie;
  const agent=await register('agent','agent-v11@example.test');
  const customer=await register('customer','customer-v11@example.test');
  const outsider=await register('customer','outsider-v11@example.test');
  await approveAgent(call,agent,admin);
  const listing=(await call('/listings','POST',{title:'V11 journey apartment',description:'Verified two bedroom rental for acceptance test',price:45000,location:{city:'Nairobi'},property:{bedrooms:2}},agent.cookie,201)).data;
  await publishProperty(call,listing.id,agent.cookie,admin);
  const slot=await createSlot(call,listing.id,agent.cookie,2);
  const preferences={city:'Nairobi',budget:50000,goal:'rent',bedrooms:2};
  await call('/customer/profile','PUT',preferences,customer.cookie);
  const profile=(await call('/customer/profile','GET',undefined,customer.cookie)).data;
  assert.deepEqual(profile.preferences,preferences);
  const slots=(await call('/properties/'+listing.id+'/slots','GET',undefined,customer.cookie)).data.slots;
  assert(slots.some(s=>s.id===slot.id));
  const payload={listingId:listing.id,slotId:slot.id,tier:'general',idempotencyKey:'v11-e2e-acceptance'};
  const requested=(await call('/viewing-requests','POST',payload,customer.cookie,201)).data;
  assert.equal(requested.status,'REQUESTED');
  const duplicate=(await call('/viewing-requests','POST',payload,customer.cookie,200)).data;
  assert.equal(duplicate.id,requested.id);
  await call('/viewing-requests/'+requested.id+'/accept','POST',{},customer.cookie,403);
  await call('/viewing-requests/'+requested.id+'/accept','POST',{},agent.cookie);
  const customerViewings=(await call('/viewing-requests','GET',undefined,customer.cookie)).data.viewings;
  const accepted=customerViewings.find(v=>v.id===requested.id);
  assert.equal(accepted.status,'ACCEPTED');
  assert(accepted.booking_id);
  assert.notEqual(accepted.payment_status,'completed');
  const agentViewings=(await call('/viewing-requests','GET',undefined,agent.cookie)).data.viewings;
  assert(agentViewings.some(v=>v.id===requested.id));
  const outsiderViewings=(await call('/viewing-requests','GET',undefined,outsider.cookie)).data.viewings;
  assert(!outsiderViewings.some(v=>v.id===requested.id));
  await call('/viewing-requests/'+requested.id+'/cancel','POST',{reason:'Unauthorized'},outsider.cookie,403);
});
