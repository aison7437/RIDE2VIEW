'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createApp}=require('../server/app');
const {approveAgent,publishProperty,customerProfile,createSlot}=require('./helpers/supply.cjs');
const {validateTypedCoverage}=require('../scripts/check-api-types');
const spec=JSON.parse(readFileSync(join(__dirname,'../docs/api/openapi.json'),'utf8'));

function assertSchema(value,schema,path='$'){
  if(schema.$ref){
    const key=schema.$ref.match(/^#\/components\/schemas\/([^/]+)$/)?.[1];
    assert.ok(key&&spec.components.schemas[key],'Unresolved schema reference '+schema.$ref);
    return assertSchema(value,spec.components.schemas[key],path);
  }
  if(schema.anyOf){
    const failures=[];let matched=false;
    for(const candidate of schema.anyOf){
      try{assertSchema(value,candidate,path);matched=true;break;}
      catch(error){failures.push(error.message);}
    }
    if(!matched)assert.fail(path+' violates each anyOf alternative: '+failures.join(' | ').slice(0,500));
  }
  if(schema.type){
    const types=Array.isArray(schema.type)?schema.type:[schema.type];
    const valid=t=>t==='null'?value===null:t==='array'?Array.isArray(value):
      t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):
      t==='integer'?Number.isSafeInteger(value):t==='number'?typeof value==='number'&&Number.isFinite(value):
      typeof value===t;
    assert.ok(types.some(valid),path+' expected '+types.join('|')+' but received '+JSON.stringify(value));
  }
  if(schema.const!==undefined)assert.deepEqual(value,schema.const,path+' const');
  if(schema.enum)assert.ok(schema.enum.includes(value),path+' invalid enum');
  if(typeof value==='string'){
    if(schema.minLength!==undefined)assert.ok(value.length>=schema.minLength,path+' too short');
    if(schema.maxLength!==undefined)assert.ok(value.length<=schema.maxLength,path+' too long');
    if(schema.pattern)assert.match(value,new RegExp(schema.pattern),path+' pattern');
    if(schema.format==='date-time')assert.ok(!Number.isNaN(Date.parse(value)),path+' invalid date-time');
    if(schema.format==='email')assert.match(value,/^[^\s@]+@[^\s@]+\.[^\s@]+$/,path+' invalid email');
    if(schema.format==='uri')assert.doesNotThrow(()=>new URL(value),path+' invalid uri');
  }
  if(typeof value==='number'){
    if(schema.minimum!==undefined)assert.ok(value>=schema.minimum,path+' below minimum');
    if(schema.maximum!==undefined)assert.ok(value<=schema.maximum,path+' above maximum');
  }
  if(Array.isArray(value)){
    if(schema.minItems!==undefined)assert.ok(value.length>=schema.minItems,path+' too few items');
    if(schema.maxItems!==undefined)assert.ok(value.length<=schema.maxItems,path+' too many items');
    if(schema.items)for(let i=0;i<value.length;i++)assertSchema(value[i],schema.items,path+'['+i+']');
  }
  if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
    for(const key of schema.required||[])assert.ok(Object.hasOwn(value,key),path+' missing '+key);
    for(const [key,val] of Object.entries(value)){
      if(schema.properties?.[key])assertSchema(val,schema.properties[key],path+'.'+key);
      else if(schema.additionalProperties===false)assert.fail(path+' unexpected property '+key);
    }
  }
}
function checkOperation(method,path,status,payload){
  const operation=spec.paths[path]?.[method.toLowerCase()];
  assert.ok(operation,'Undocumented endpoint '+method+' '+path);
  const schema=operation.responses[String(status)]?.content?.['application/json']?.schema;
  assert.ok(schema,'Missing response schema '+method+' '+path+' '+status);
  assertSchema(payload,schema,method+' '+path+' '+status);
}
function checkRequest(method,path,payload){
  const schema=spec.paths[path]?.[method.toLowerCase()]?.requestBody?.content?.['application/json']?.schema;
  assert.ok(schema,'Missing typed request '+method+' '+path);
  assertSchema(payload,schema,method+' '+path+' request');
}
async function fixture(t,options={}){
  const sent=[];
  const app=createApp({
    dbPath:':memory:',
    adminEmail:'admin@api02.test',
    adminPassword:'Test-Administrator-API02-234',
    startOperationsRuntime:false,
    startSideEffectRuntime:false,
    startProviderCallbackRuntime:false,
    startPaymentInitiationRuntime:false,
    ...options,
    ...(options.authVerificationProvider?{}:{authVerificationProvider:{channels:{email:true,phone:true},async send(m){sent.push(m);return {messageId:'api02-test-message'};}}})
  });
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>app.close());
  const origin='http://127.0.0.1:'+app.server.address().port;
  const call=async(path,method='GET',body,cookie,expected=200)=>{
    const response=await fetch(origin+'/api'+path,{
      method,headers:{...(method!=='GET'?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},
      body:method!=='GET'?JSON.stringify(body??{}):undefined
    });
    const data=await response.json();
    assert.equal(response.status,expected,method+' '+path+': '+JSON.stringify(data));
    return {data,status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  const signup=async(role,name)=>{
    const email=role+'-'+name.toLowerCase().replace(/\s/g,'')+'@api02.test';
    const creds={name,email,password:'Test-Password-API02-12345',role};
    const result=await call('/auth/register','POST',creds,null,201);
    const login=await call('/auth/login','POST',creds);
    return {id:result.data.id,cookie:login.cookie,...creds};
  };
  const admin=(await call('/auth/login','POST',{email:'admin@api02.test',password:'Test-Administrator-API02-234'})).cookie;
  return {app,call,sent,signup,admin};
}

test('API-02 selected route/schema coverage and security invariants',()=>{
  assert.equal(validateTypedCoverage(),24);
  assert.ok(spec.paths['/api/provider-callbacks/{provider}'].post.security[0].providerSignature);
  const invalid={listingId:'listing',slotId:'slot'};
  assert.throws(()=>checkRequest('POST','/api/viewing-requests',invalid),/missing idempotencyKey/);
  assert.throws(()=>assertSchema({reference:'INV',amount:650},spec.components.schemas.ManualPaymentVerificationRequest),/pattern|too short/);
  const valid={reference:'RECEIPT_000001',amount:650};
  checkRequest('POST','/api/payments/{id}/verify',valid);
});

test('API-02 real email and phone challenges, verified sessions, login, profile and logout',async t=>{
  const {call,sent}=await fixture(t,{otpSecret:'API02-TEST-OTP-SECRET-AT-LEAST-32-CHARACTERS'});
  const request={email:'user@api02.test',name:'Verified Customer',password:'Test-Password-API02-12345',role:'customer'};
  checkRequest('POST','/api/auth/email/challenges',request);
  const challenge=await call('/auth/email/challenges','POST',request,null,202);
  checkOperation('POST','/api/auth/email/challenges',202,challenge.data);
  assert.equal('code' in challenge.data,false,'Never expose OTP in the HTTP response');
  const otp=sent.at(-1).text.match(/\b\d{6}\b/)?.[0];
  assert.ok(otp,'Synthetic provider should receive an OTP');
  const verified=await call('/auth/challenges/verify','POST',{challengeId:challenge.data.challengeId,code:otp});
  checkOperation('POST','/api/auth/challenges/verify',200,verified.data);
  assert.ok(verified.cookie?.startsWith('r2v_session='));
  const me=await call('/auth/me','GET',undefined,verified.cookie);
  checkOperation('GET','/api/auth/me',200,me.data);
  const login=await call('/auth/login','POST',{email:request.email,password:request.password});
  checkOperation('POST','/api/auth/login',200,login.data);
  const logout=await call('/auth/logout','POST',{},verified.cookie);
  checkOperation('POST','/api/auth/logout',200,logout.data);
  await call('/auth/me','GET',undefined,verified.cookie,401);

  const phoneInput={phone:'+254712345678',name:'Phone Customer',role:'customer'};
  checkRequest('POST','/api/auth/phone/challenges',phoneInput);
  const phone=await call('/auth/phone/challenges','POST',phoneInput,null,202);
  checkOperation('POST','/api/auth/phone/challenges',202,phone.data);
  const phoneOtp=sent.at(-1).text.match(/\b\d{6}\b/)?.[0];
  const phoneVerified=await call('/auth/challenges/verify','POST',{challengeId:phone.data.challengeId,code:phoneOtp});
  checkOperation('POST','/api/auth/challenges/verify',200,phoneVerified.data);
  assert.equal(phoneVerified.data.email,null);
  assert.ok(phoneVerified.data.phone?.startsWith('+254'));
});

test('API-02 live property, viewing request, replay, booking, payment and journey contracts',async t=>{
  const {app,call,signup,admin}=await fixture(t);
  const agent=await signup('agent','Supply Operator');
  const customer=await signup('customer','Customer Tester');
  await approveAgent(call,agent,admin);
  const create={title:'API-02 Synthetic Flat',price:40000,location:{city:'Nairobi'},property:{bedrooms:2},transactionType:'rent'};
  checkRequest('POST','/api/listings',create);
  const draft=await call('/listings','POST',create,agent.cookie,201);
  checkOperation('POST','/api/listings',201,draft.data);
  await publishProperty(call,draft.data.id,agent.cookie,admin);
  const listing=(await call('/listings')).data;
  checkOperation('GET','/api/listings',200,listing);
  assert.ok(listing.listings.some(p=>p.id===draft.data.id));
  const slot=await createSlot(call,draft.data.id,agent.cookie);
  checkOperation('POST','/api/properties/{id}/slots',201,slot);
  const slots=(await call('/properties/'+draft.data.id+'/slots','GET',undefined,customer.cookie)).data;
  checkOperation('GET','/api/properties/{id}/slots',200,slots);
  await customerProfile(call,customer.cookie);
  const profile=await call('/customer/profile','GET',undefined,customer.cookie);
  checkOperation('GET','/api/customer/profile',200,profile.data);
  const request={listingId:draft.data.id,slotId:slot.id,tier:'general',idempotencyKey:'api02-first-request'};
  checkRequest('POST','/api/viewing-requests',request);
  const viewing=await call('/viewing-requests','POST',request,customer.cookie,201);
  checkOperation('POST','/api/viewing-requests',201,viewing.data);
  const replay=await call('/viewing-requests','POST',request,customer.cookie,200);
  checkOperation('POST','/api/viewing-requests',200,replay.data);
  assert.equal(replay.data.duplicate,true);
  const viewings=await call('/viewing-requests','GET',undefined,customer.cookie);
  checkOperation('GET','/api/viewing-requests',200,viewings.data);
  await call('/viewing-requests/'+viewing.data.id+'/accept','POST',{},agent.cookie,200);
  const bookings=await call('/bookings','GET',undefined,customer.cookie);
  checkOperation('GET','/api/bookings',200,bookings.data);
  assert.equal(bookings.data.bookings.length,1);
  const paymentId=bookings.data.bookings[0].payment_id;
  const payment=app.db.prepare('SELECT amount FROM payments WHERE id=?').get(paymentId);
  assert.ok(payment?.amount>0);
  await call('/payments/'+paymentId+'/verify','POST',{reference:'API02_PAID_12345',amount:payment.amount},customer.cookie,403);
  const settlement=await call('/payments/'+paymentId+'/verify','POST',{reference:'API02_PAID_12345',amount:payment.amount},admin);
  checkOperation('POST','/api/payments/{id}/verify',200,settlement.data);
  assert.equal(settlement.data.status,'confirmed');

  await call('/customer/details','PUT',{version:0,phone:'+254700123456',pickup:'Nairobi test pickup',preferredContact:'phone'},customer.cookie);
  const second=await createSlot(call,draft.data.id,agent.cookie,2);
  const journeyInput={stops:[{listingId:draft.data.id,slotId:second.id}],tier:'general',returnJourney:true,participants:[{name:'Customer Tester',relationship:'customer'}],idempotencyKey:'api02-journey'};
  checkRequest('POST','/api/journeys',journeyInput);
  const journey=await call('/journeys','POST',journeyInput,customer.cookie,201);
  checkOperation('POST','/api/journeys',201,journey.data);
  const journeyList=await call('/journeys','GET',undefined,customer.cookie);
  checkOperation('GET','/api/journeys',200,journeyList.data);
  const fetched=await call('/journeys/'+journey.data.id,'GET',undefined,customer.cookie);
  checkOperation('GET','/api/journeys/{id}',200,fetched.data);
  // A draft itinerary has no accepted agent stop; the agent must not see it yet.
  // Full post-acceptance redaction is covered by tests/viewing-packages.test.js.
  await call('/journeys/'+journey.data.id,'GET',undefined,agent.cookie,403);
  const replayJourney=await call('/journeys','POST',journeyInput,customer.cookie,200);
  checkOperation('POST','/api/journeys',200,replayJourney.data);
  assert.equal(replayJourney.data.duplicate,true);
});
