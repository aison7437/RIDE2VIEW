const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../server/app');
test('Ride2Go feedback requires completed customer-owned ride and is immutable',async t=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false,startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false});
 t.after(()=>app.close());
 const db=app.db;
 const customer={id:'rating-customer',role:'customer'},other={id:'rating-other',role:'customer'},driver={id:'rating-driver',role:'driver'};
 const hash='unused';
 for(const [id,role] of [[customer.id,'customer'],[other.id,'customer'],[driver.id,'driver']]){
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,id+'@test.example',id,hash,role,1);
 }
 const id='rating-ride';
 db.prepare("INSERT INTO ride2go_trips(id,customer_id,plan,status,idempotency_key,created_at,updated_at) VALUES(?,?,?,'IN_PROGRESS',?,?,?)").run(id,customer.id,JSON.stringify({pickup:'Westlands',destination:'Kilimani',tier:'general'}),'rating-key',new Date().toISOString(),new Date().toISOString());
 const {createRide2GoFeedback}=require('../server/mobility/ride2go/post-trip');
 const authority=createRide2GoFeedback({db});
 assert.throws(()=>authority.submit(customer,id,{rating:5}),{status:409});
 assert.throws(()=>authority.submit(other,id,{rating:5}),{status:403});
 assert.throws(()=>authority.submit(driver,id,{rating:5}),{status:403});
 db.prepare("UPDATE ride2go_trips SET status='COMPLETED' WHERE id=?").run(id);
 assert.throws(()=>authority.submit(customer,id,{rating:0}),{status:400});
 const result=authority.submit(customer,id,{rating:5,comment:'Good ride'});
 assert.equal(result.rating,5);
 assert.equal(authority.read(customer,id).feedback.rating,5);
 assert.equal(authority.submit(customer,id,{rating:5,comment:'Good ride'}).duplicate,true);
 assert.throws(()=>authority.submit(customer,id,{rating:1,comment:'changed'}),{status:409});
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ride2go_feedback').get().n,1);
});
