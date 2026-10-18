const test=require('node:test');
const assert=require('node:assert/strict');
const {openStore}=require('../server/store');
const {seedDriver}=require('./helpers/mobility.cjs');
const {createDispatchAuthority}=require('../server/mobility/dispatch');

test('V11 payment-to-dispatch recovery: unpaid denial, authoritative payment, offer idempotency, stale reservation and cancellation',()=>{
 const db=openStore(':memory:');
 try{
  const now=new Date().toISOString();
  db.prepare("INSERT INTO users VALUES('c','c@x','C','x','customer',1),('d','d@x','D','x','driver',1),('a','a@x','A','x','agent',1)").run();
  db.prepare("INSERT INTO listings VALUES('l','a','{}',1,1)").run();
  db.prepare("INSERT INTO bookings VALUES('b','c','l','general',650,'requested',?,NULL,?)").run(now,now);
  db.prepare("INSERT INTO payments VALUES('p','b',650,'pending',NULL,NULL,NULL)").run();
  db.prepare("INSERT INTO reservations(id,customer_id,resource_id,resource_type,start_at,end_at,status,hold_expires_at,idempotency_key,dependencies,version,created_at,updated_at) VALUES('r','c','l','property',?,?,'CONFIRMED',NULL,'reservation-v11','[]',1,?,?)").run(now,now,now,now);
  db.prepare("INSERT INTO booking_reservations VALUES('b','r',?)").run(now);
  seedDriver(db,'d');
  const dispatch=createDispatchAuthority({db});
  const offer=()=>dispatch.offer({bookingId:'b',driverId:'d',idempotencyKey:'offer-v11'});
  assert.throws(offer,e=>e.code==='PAYMENT_OR_BOOKING_NOT_CONFIRMED');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM dispatch_assignments').get().n,0);
  // Simulates the committed payment authority's resulting state; no provider callback is invoked here.
  db.transaction(()=>{
   db.prepare("UPDATE payments SET status='paid',reference='synthetic-v11-reference',verified_at=? WHERE id='p'").run(now);
   db.prepare("UPDATE bookings SET status='confirmed' WHERE id='b'").run();
  })();
  const first=offer();
  assert.equal(offer().duplicate,true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM dispatch_assignments').get().n,1);
  db.prepare("UPDATE reservations SET status='CANCELLED' WHERE id='r'").run();
  assert.throws(()=>dispatch.accept({assignmentId:first.id,driverId:'d'}),e=>e.code==='ASSIGNMENT_NO_LONGER_ELIGIBLE');
  assert.notEqual(db.prepare('SELECT status FROM dispatch_assignments WHERE id=?').get(first.id).status,'ASSIGNED');
  assert.equal(dispatch.cancelForBooking({bookingId:'b'}).status,'CANCELLED');
  assert.equal(dispatch.cancelForBooking({bookingId:'b'}).status,'NO_ACTIVE_ASSIGNMENT');
 }finally{db.close();}
});
