const test=require('node:test');
const assert=require('node:assert/strict');
const {openStore}=require('../server/store');
const {createPaymentAuthority}=require('../server/payments');
const {createProviderBoundary}=require('../server/payments/providers/provider-boundary');

function fixture(){
 const db=openStore(':memory:'),now=new Date().toISOString();
 db.prepare("INSERT INTO users VALUES('c','c@x','C','x','customer',1),('ag','ag@x','Agent','x','agent',1)").run();
 db.prepare("INSERT INTO listings VALUES('l','ag','{}',1,1)").run();
 db.prepare("INSERT INTO bookings VALUES('b','c','l','general',650,'requested',?,NULL,?)").run(now,now);
 db.prepare("INSERT INTO payments VALUES('p','b',650,'pending',NULL,NULL,NULL)").run();
 db.prepare("INSERT INTO payment_intents(id,payment_kind,payment_id,provider,amount,currency,customer_contact,idempotency_key,correlation_id,provider_request_id,status,created_at,updated_at) VALUES('i','booking_payment','p','sandbox',650,'KES','254700000000','intent-v11','corr-v11',NULL,'REQUESTED',?,?)").run(now,now);
 const provider={verifySignature:({signature})=>signature==='sandbox-signature',parseEvent:({rawBody})=>JSON.parse(rawBody)};
 const boundary=createProviderBoundary({db,paymentAuthority:createPaymentAuthority({db}),providers:{sandbox:provider},baseBackoffMs:1});
 const event={providerEventId:'evt-v11',correlationId:'corr-v11',paymentKind:'booking_payment',paymentId:'p',type:'PAYMENT_SUCCEEDED',amount:650,currency:'KES',reference:'V11REF0001'};
 const receive=(payload=event,signature='sandbox-signature')=>boundary.receive({provider:'sandbox',rawBody:JSON.stringify(payload),signature});
 return {db,boundary,event,receive};
}

test('signed sandbox callback confirms booking atomically and duplicate delivery is idempotent',()=>{
 const {db,boundary,receive}=fixture();
 try{
  assert.throws(()=>receive(undefined,'invalid-signature'),e=>e.code==='INVALID_PROVIDER_SIGNATURE');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM provider_callback_inbox').get().n,0);
  const first=receive();
  assert.equal(first.status,'RECEIVED');
  assert.equal(receive().duplicate,true);
  assert.equal(db.prepare('SELECT status FROM payments WHERE id=?').get('p').status,'pending');
  const result=boundary.process({inboxId:first.id,workerId:'worker-v11'});
  assert.equal(result.booking_status,'confirmed');
  assert.equal(db.prepare('SELECT status FROM bookings WHERE id=?').get('b').status,'confirmed');
  assert.equal(db.prepare('SELECT status FROM payments WHERE id=?').get('p').status,'paid');
  assert.equal(db.prepare('SELECT status FROM payment_intents WHERE id=?').get('i').status,'CONFIRMED');
  assert.equal(db.prepare('SELECT status FROM provider_callback_inbox WHERE id=?').get(first.id).status,'PROCESSED');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM provider_payment_events').get().n,1);
  assert.equal(boundary.process({inboxId:first.id,workerId:'worker-v11'}).duplicate,true);
  assert.equal(receive().duplicate,true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM payment_references').get().n,1);
 }finally{db.close();}
});

test('callback replay with changed payload is rejected before any payment mutation',()=>{
 const {db,event,receive}=fixture();
 try{
  receive();
  assert.throws(()=>receive({...event,reference:'V11REF0002'}),e=>e.code==='PROVIDER_EVENT_REPLAY_CONFLICT');
  assert.throws(()=>receive({...event,amount:651}),e=>e.code==='PROVIDER_INTENT_AMOUNT_MISMATCH');
  assert.equal(db.prepare('SELECT status FROM payments WHERE id=?').get('p').status,'pending');
 }finally{db.close();}
});

test('failed callback processing rolls back payment state and supports explicit retry',()=>{
 const {db,boundary,receive}=fixture();
 try{
  const inbox=receive();
  db.prepare("UPDATE bookings SET status='cancelled' WHERE id='b'").run();
  assert.throws(()=>boundary.process({inboxId:inbox.id,workerId:'worker-v11'}),e=>e.code==='BOOKING_NOT_PAYABLE');
  assert.equal(db.prepare('SELECT status FROM payments WHERE id=?').get('p').status,'pending');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM payment_references').get().n,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM provider_payment_events').get().n,0);
  assert.equal(db.prepare('SELECT status FROM provider_callback_inbox WHERE id=?').get(inbox.id).status,'FAILED');
  db.prepare("UPDATE bookings SET status='requested' WHERE id='b'").run();
  const retried=boundary.process({inboxId:inbox.id,workerId:'worker-v11'});
  assert.equal(retried.booking_status,'confirmed');
  assert.equal(db.prepare('SELECT status FROM provider_callback_inbox WHERE id=?').get(inbox.id).status,'PROCESSED');
 }finally{db.close();}
});
