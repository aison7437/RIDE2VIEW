const test = require('node:test'), assert = require('node:assert/strict');
const {mkdtempSync,rmSync} = require('node:fs'), {tmpdir} = require('node:os'), {join} = require('node:path');
const {createHash} = require('node:crypto');
const {createApp} = require('../server/app');
const options = {startOperationsRuntime:false,startSideEffectRuntime:false};
function fixture(t,dbPath=':memory:') {
  const app=createApp({...options,dbPath}), actors={};
  t.after(()=>app.close());
  for(const [id,role] of [['admin','admin'],['buyer','customer'],['other','customer'],['merchant','agent'],['second','agent'],['driver','driver'],['otherdriver','driver']]) {
    app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,id+'@shopping.test',id,'unused',role);actors[id]={id,role,verified:1};
  }
  for(const merchant of [actors.merchant,actors.second]) {
    app.expansion.merchant(merchant,{businessName:merchant.id});app.expansion.verifyMerchant(actors.admin,merchant.id);
    app.expansion.item(merchant,{sku:'meal',title:'Meal '+merchant.id,category:'food',quantity:10,unitPrice:500});
  }
  return {app,...actors};
}
function cart(f,items=[{merchantId:'merchant',sku:'meal',qty:2}]) {
  return f.app.shopping.saveCart(f.buyer,{version:f.app.shopping.cart(f.buyer).version,items});
}
function reviewed(f,items) {const c=cart(f,items);return f.app.shopping.review(f.buyer,{version:c.version});}
test('durable cart versions reject lost updates, duplicate items and invalid quantities',t=>{
  const f=fixture(t),s=f.app.shopping;assert.equal(s.cart(f.buyer).version,0);const c=cart(f);assert.equal(c.total,1000);
  assert.throws(()=>s.saveCart(f.buyer,{version:0,items:[]}),/another window/);
  for(const qty of [0,-1,1.5,100,'2',null])assert.throws(()=>cart(f,[{merchantId:'merchant',sku:'meal',qty}]),/quantity/);
  assert.throws(()=>cart(f,[{merchantId:'merchant',sku:'meal',qty:1},{merchantId:'merchant',sku:'meal',qty:2}]),/duplicate/);
  assert.equal(s.cart(f.buyer).version,1);assert.equal(s.cart(f.other).items.length,0);
  assert.equal(s.saveCart(f.buyer,{version:1,items:[]}).items.length,0);
});
test('reviewed multi-merchant checkout is atomic, replay-safe and does not charge or reserve stock',t=>{
  const f=fixture(t),s=f.app.shopping,r=reviewed(f,[{merchantId:'merchant',sku:'meal',qty:2},{merchantId:'second',sku:'meal',qty:1}]);
  assert.equal(r.total,1500);assert.equal(r.stockReserved,false);
  const order=s.checkout(f.buyer,{reviewId:r.id});assert.equal(order.orders.length,2);assert.equal(order.checkout.total,1500);
  assert.equal(s.checkout(f.buyer,{reviewId:r.id}).checkout.id,order.checkout.id);assert.equal(s.cart(f.buyer).items.length,0);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM commerce_payments').get().n,0);
  assert.equal(f.app.db.prepare('SELECT SUM(quantity) n FROM commerce_inventory').get().n,20);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM commerce_orders').get().n,2);
  assert.throws(()=>s.checkout(f.other,{reviewId:r.id}),/not found/);assert.throws(()=>s.getCheckout(f.other,order.checkout.id),/not found/);
});
test('second-order storage failure rolls back checkout, first order and cart clearing',t=>{
  const f=fixture(t),r=reviewed(f,[{merchantId:'merchant',sku:'meal',qty:1},{merchantId:'second',sku:'meal',qty:1}]);
  f.app.db.exec("CREATE TRIGGER simulate_failure BEFORE INSERT ON commerce_orders WHEN NEW.merchant_id='second' BEGIN SELECT RAISE(ABORT,'test failure'); END");
  assert.throws(()=>f.app.shopping.checkout(f.buyer,{reviewId:r.id}),/test failure/);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM commerce_orders').get().n,0);assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM commerce_checkouts').get().n,0);
  assert.equal(f.app.shopping.cart(f.buyer).items.length,2);
});
test('price review rejects offsetting per-item changes, stock shortages and expired reviews',t=>{
  const f=fixture(t),s=f.app.shopping,items=[{merchantId:'merchant',sku:'meal',qty:1},{merchantId:'second',sku:'meal',qty:1}];
  let r=reviewed(f,items);
  f.app.commerceInventory.setStock({merchantId:'merchant',sku:'meal',quantity:10,unitPrice:600,actor:f.merchant});
  f.app.commerceInventory.setStock({merchantId:'second',sku:'meal',quantity:10,unitPrice:400,actor:f.second});
  assert.throws(()=>s.checkout(f.buyer,{reviewId:r.id}),/Prices changed/);
  r=s.review(f.buyer,{version:s.cart(f.buyer).version});f.app.db.prepare("UPDATE commerce_inventory SET quantity=0 WHERE merchant_id='second'").run();
  assert.throws(()=>s.checkout(f.buyer,{reviewId:r.id}),/stock/);
  f.app.db.prepare("UPDATE commerce_inventory SET quantity=10 WHERE merchant_id='second'").run();
  f.app.db.prepare("UPDATE shopping_reviews SET expires_at='2000-01-01T00:00:00Z' WHERE id=?").run(r.id);
  assert.throws(()=>s.checkout(f.buyer,{reviewId:r.id}),/expired/);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM commerce_orders').get().n,0);
});
test('changed carts, suspended merchants and inactive catalog items cannot be checked out',t=>{
  const f=fixture(t),s=f.app.shopping,r=reviewed(f);cart(f);assert.throws(()=>s.checkout(f.buyer,{reviewId:r.id}),/cart changed/);
  f.app.expansion.verifyMerchant(f.admin,f.merchant.id,'SUSPENDED');assert.equal(s.cart(f.buyer).items[0].issue,'Item is no longer available');
  assert.throws(()=>s.review(f.buyer,{version:s.cart(f.buyer).version}),/no longer available/);
  f.app.expansion.verifyMerchant(f.admin,f.merchant.id,'VERIFIED');f.app.db.exec('UPDATE commerce_catalog_items SET active=0');
  assert.throws(()=>s.review(f.buyer,{version:s.cart(f.buyer).version}),/no longer available/);
  assert.equal(s.saveCart(f.buyer,{version:s.cart(f.buyer).version,items:[]}).items.length,0);
});
test('money overflow and empty reviews fail without orders or payments',t=>{
  const f=fixture(t),s=f.app.shopping;assert.throws(()=>s.review(f.buyer,{version:0}),/Add an item/);
  f.app.commerceInventory.setStock({merchantId:'merchant',sku:'meal',quantity:10,unitPrice:Number.MAX_SAFE_INTEGER,actor:f.merchant});
  const c=cart(f);assert.equal(c.total,null);assert.throws(()=>s.review(f.buyer,{version:c.version}),/out of range/);
});
test('merchant preparation and manual verification preserve payment authority and customer history',t=>{
  const f=fixture(t),s=f.app.shopping,r=reviewed(f),c=s.checkout(f.buyer,{reviewId:r.id}),id=c.orders[0].id;
  assert.throws(()=>s.preparePayment(f.buyer,id),/cannot perform/);assert.throws(()=>s.preparePayment(f.second,id),/not found/);
  assert.equal(s.preparePayment(f.merchant,id).status,'PAYMENT_PENDING');s.preparePayment(f.merchant,id);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM commerce_payments').get().n,1);
  assert.throws(()=>s.verifyPayment(f.merchant,id,{amount:1000,reference:'PAYMENT123'}),/cannot perform/);
  assert.throws(()=>s.verifyPayment(f.admin,id,{amount:999,reference:'PAYMENT123'}),/AMOUNT_MISMATCH/);
  assert.equal(s.verifyPayment(f.admin,id,{amount:1000,reference:'PAYMENT123'}).status,'PAYMENT_CONFIRMED');
  assert.equal(s.verifyPayment(f.admin,id,{amount:1000,reference:'PAYMENT123'}).payment.status,'paid');
  const h=s.history(f.buyer);assert.equal(h.checkouts[0].orders[0].payment.status,'paid');assert(!JSON.stringify(h).includes('PAYMENT123'));
  assert.equal(s.history(f.other).checkouts.length,0);assert.equal(s.merchantOrders(f.second).orders.length,0);
});
test('merchant cannot collect a silently changed price after customer checkout',t=>{
  const f=fixture(t),r=reviewed(f),o=f.app.shopping.checkout(f.buyer,{reviewId:r.id}).orders[0];
  f.app.commerceInventory.setStock({merchantId:'merchant',sku:'meal',quantity:10,unitPrice:600,actor:f.merchant});
  assert.throws(()=>f.app.shopping.preparePayment(f.merchant,o.id),/Prices changed/);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM commerce_payments').get().n,0);
});
test('cart and replay bindings survive a database reopen; migration preserves older checksums',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'r2v-shopping-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const path=join(dir,'data.sqlite'),app=createApp({...options,dbPath:path});
  for(const [id,role] of [['buyer','customer'],['merchant','agent'],['admin','admin']])app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,id+'@persist.test',id,'unused',role);
  const buyer={id:'buyer',role:'customer'},merchant={id:'merchant',role:'agent'};
  app.expansion.merchant(merchant,{businessName:'Shop'});app.expansion.verifyMerchant({id:'admin',role:'admin'},'merchant');app.expansion.item(merchant,{sku:'meal',title:'Meal',category:'food',quantity:10,unitPrice:500});
  app.shopping.saveCart(buyer,{version:0,items:[{merchantId:'merchant',sku:'meal',qty:1}]});
  const before=app.db.prepare('SELECT version,checksum FROM schema_migrations WHERE version<26').all();await app.close();
  const reopened=createApp({...options,dbPath:path});assert.equal(reopened.shopping.cart(buyer).total,500);
  const review=reopened.shopping.review(buyer,{version:1}),checkout=reopened.shopping.checkout(buyer,{reviewId:review.id});await reopened.close();
  const third=createApp({...options,dbPath:path});t.after(()=>third.close());assert.equal(third.shopping.checkout(buyer,{reviewId:review.id}).checkout.id,checkout.checkout.id);
  assert.deepEqual(third.db.prepare('SELECT version,checksum FROM schema_migrations WHERE version<26').all(),before);
});
test('history pages retain all orders without leaking another customer',t=>{
  const f=fixture(t);for(let i=0;i<22;i++){const r=reviewed(f);f.app.shopping.checkout(f.buyer,{reviewId:r.id});}
  const h=f.app.shopping.history(f.buyer);assert.equal(h.checkouts.length,20);assert.equal(h.nextOffset,20);
  assert.equal(f.app.shopping.history(f.buyer,20).checkouts.length,2);assert.equal(f.app.shopping.history(f.other).nextOffset,null);
});
test('dashboards use only owned activity and real eligible public inventory',t=>{
  const f=fixture(t),d=f.app.dashboard.get(f.buyer);assert.equal(d.metrics.credits,0);assert.equal(d.metrics.checkouts,0);assert.equal(d.properties.length,0);
  const r=reviewed(f);f.app.shopping.checkout(f.buyer,{reviewId:r.id});assert.equal(f.app.dashboard.get(f.buyer).metrics.checkouts,1);assert.equal(f.app.dashboard.get(f.other).metrics.checkouts,0);
  f.app.db.prepare('INSERT INTO notifications VALUES(?,?,?,?)').run('secret',f.other.id,'Other account private message',new Date().toISOString());
  assert(!JSON.stringify(f.app.dashboard.get(f.buyer)).includes('Other account'));
  const p=f.app.supply.createListing(f.admin,{title:'Published property',description:'Synthetic test',price:40000,location:{city:'Nairobi'},property:{bedrooms:2}});
  f.app.db.prepare('UPDATE listings SET approved=1 WHERE id=?').run(p.id);f.app.db.prepare("UPDATE supply_checks SET status='APPROVED',expires_at=? WHERE target_id=?").run(new Date(Date.now()+86400000).toISOString(),p.id);
  assert.equal(f.app.dashboard.get(f.buyer).properties.length,1);
  f.app.supply.profile(f.buyer,{city:'Mombasa',budget:50000,goal:'rent'});assert.equal(f.app.dashboard.get(f.buyer).properties.length,0);
  assert.throws(()=>f.app.dashboard.get(f.merchant),/customers and drivers/);
});
test('driver overview distinguishes earnings currencies and statuses and excludes other drivers',t=>{
  const f=fixture(t),time=new Date().toISOString();
  for(const [id,owner,currency,status,amount] of [['e1','driver','KES','EARNED',500],['e2','driver','KES','PAID',200],['e3','driver','KES','VOID',1000],['e4','driver','USD','EARNED',30],['e5','otherdriver','KES','EARNED',999]]) {
    f.app.db.prepare('INSERT INTO marketplace_earnings VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL,?,?)').run(id,owner,'driver','test',id,amount,0,amount,currency,status,'test-only',time,time);
  }
  const d=f.app.dashboard.get(f.driver);assert.equal(d.metrics.earnedKES,700);assert.equal(d.earnings.length,4);assert.equal(d.readiness.online,false);assert.equal(d.metrics.completedTrips,0);
});
test('HTTP boundaries require role and ownership, and reject stale cart writes with 409',async t=>{
  const f=fixture(t);await new Promise(r=>f.app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+f.app.server.address().port;
  for(const actor of [f.buyer,f.other,f.merchant])f.app.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(actor.id).digest('hex'),actor.id,Date.now()+60000);
  async function call(path,actor,method='GET',body){return fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(actor?{Cookie:'r2v_session='+actor.id}:{})},body:body?JSON.stringify(body):undefined});}
  assert.equal((await call('/rideplate/cart')).status,401);assert.equal((await call('/rideplate/cart',f.merchant)).status,403);
  cart(f);assert.equal((await call('/rideplate/cart',f.buyer,'PUT',{version:0,items:[]})).status,409);
  const r=f.app.shopping.review(f.buyer,{version:1}),checkout=f.app.shopping.checkout(f.buyer,{reviewId:r.id});
  assert.equal((await call('/rideplate/checkouts/'+checkout.checkout.id,f.other)).status,404);assert.equal((await call('/dashboard',f.buyer)).status,200);
});
test('migration 26 upgrades existing checkout history without changing older migrations',t=>{
  const f=fixture(t),legacy=f.app.expansion.checkout(f.buyer,{idempotencyKey:'legacy-upgrade',groups:[{merchantId:'merchant',items:[{sku:'meal',qty:1}]}]});
  const checksums=f.app.db.prepare('SELECT version,checksum FROM schema_migrations WHERE version<26').all();
  f.app.db.exec('DROP TABLE shopping_reviews; DROP TABLE shopping_carts; DELETE FROM schema_migrations WHERE version=26');
  require('../server/migrations').runMigrations(f.app.db);
  assert.deepEqual(f.app.db.prepare('SELECT version,checksum FROM schema_migrations WHERE version<26').all(),checksums);
  assert.equal(f.app.shopping.history(f.buyer).checkouts[0].checkout.id,legacy.checkout.id);assert.equal(f.app.shopping.cart(f.buyer).version,0);
});
test('driver counts a completed viewing package once, and never counts a partly completed itinerary',t=>{
  const f=fixture(t),time=new Date().toISOString(),p=f.app.supply.createListing(f.admin,{title:'Counted home',price:40000,location:{city:'Nairobi'},property:{bedrooms:2}});
  for(let i=0;i<3;i++){
    f.app.db.prepare('INSERT INTO bookings VALUES(?,?,?,?,?,?,?,?,?)').run('b'+i,'buyer',p.id,'general',650,'completed',time,'driver',time);
  }
  f.app.db.prepare("INSERT INTO viewing_journeys(id,customer_id,status,plan,master_booking_id,idempotency_key,created_at,updated_at) VALUES('package','buyer','IN_PROGRESS',?,'b0','package',?,?)")
    .run(JSON.stringify({tier:'general',participants:[],stops:[]}),time,time);
  for(let i=0;i<3;i++){
    f.app.db.prepare('INSERT INTO property_slots VALUES(?,?,?,?,1,?)').run('s'+i,p.id,new Date(Date.now()+i*7200000).toISOString(),new Date(Date.now()+i*7200000+3600000).toISOString(),time);
    f.app.db.prepare("INSERT INTO viewing_requests VALUES(?,?,?,?,'general','ACCEPTED',?,?,NULL,?,?)").run('r'+i,'buyer',p.id,'s'+i,'b'+i,'r'+i,time,time);
    f.app.db.prepare("INSERT INTO journey_stops VALUES('package',?,?,?,'COMPLETED')").run(i,'r'+i,'b'+i);
  }
  assert.equal(f.app.dashboard.get(f.driver).metrics.completedTrips,0);
  f.app.db.exec("UPDATE viewing_journeys SET status='COMPLETED' WHERE id='package'");assert.equal(f.app.dashboard.get(f.driver).metrics.completedTrips,1);
  assert.equal(f.app.dashboard.get(f.otherdriver).metrics.completedTrips,0);
});
