const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../server/app');

test('HTTP callback ingress requires a valid provider signature and acknowledges durable duplicates',async(t)=>{
 const adapter={
  capabilities:{callbackVerification:true},
  verifySignature:({signature})=>signature==='test-signature',
  parseEvent:({rawBody})=>JSON.parse(rawBody)
 };
 const app=createApp({dbPath:':memory:',paymentProviders:{sandbox:adapter},startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false,startSideEffectRuntime:false});
 t.after(async()=>app.close());
 const db=app.db,now=new Date().toISOString();
 db.prepare("INSERT INTO users VALUES('c','c@x','C','x','customer',1),('ag','ag@x','Agent','x','agent',1)").run();
 db.prepare("INSERT INTO listings VALUES('l','ag','{}',1,1)").run();
 db.prepare("INSERT INTO bookings VALUES('b','c','l','general',650,'requested',?,NULL,?)").run(now,now);
 db.prepare("INSERT INTO payments VALUES('p','b',650,'pending',NULL,NULL,NULL)").run();
 db.prepare("INSERT INTO payment_intents(id,payment_kind,payment_id,provider,amount,currency,customer_contact,idempotency_key,correlation_id,provider_request_id,status,created_at,updated_at) VALUES('i','booking_payment','p','sandbox',650,'KES','254700000000','http-v11','corr-http-v11',NULL,'REQUESTED',?,?)").run(now,now);
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+app.server.address().port+'/api/provider-callbacks/sandbox';
 const event={providerEventId:'evt-http-v11',correlationId:'corr-http-v11',paymentKind:'booking_payment',paymentId:'p',type:'PAYMENT_SUCCEEDED',amount:650,currency:'KES',reference:'HTTPV11REF'};
 async function post(body,signature='test-signature'){
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-provider-signature':signature},body:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
 }
 assert.equal((await post(event,'wrong')).status,400);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM provider_callback_inbox').get().n,0);
 const first=await post(event);
 assert.equal(first.status,202);
 assert.equal(first.data.accepted,true);
 assert.equal(first.data.duplicate,false);
 const duplicate=await post(event);
 assert.equal(duplicate.status,200);
 assert.equal(duplicate.data.duplicate,true);
 assert.equal((await post({...event,reference:'DIFFERENTREF'})).status,409);
 assert.equal(db.prepare('SELECT status FROM payments WHERE id=?').get('p').status,'pending');
 const processed=app.providerBoundary.processDue({workerId:'http-test-worker'});
 assert.equal(processed.length,1);
 assert.equal(processed[0].ok,true);
 assert.equal(db.prepare('SELECT status FROM payments WHERE id=?').get('p').status,'paid');
 assert.equal(db.prepare('SELECT status FROM bookings WHERE id=?').get('b').status,'confirmed');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM provider_payment_events').get().n,1);
});
