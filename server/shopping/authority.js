const {randomUUID} = require('node:crypto');
const {createPricingAuthority} = require('../commerce/pricing/core/pricing-authority');
const fail = (status, message) => {throw Object.assign(new Error(message), {status});};
function role(actor, ...roles) {
  if (!actor) fail(401, 'Sign in to continue');
  if (!roles.includes(actor.role)) fail(403, 'This account cannot perform this action');
}
function createShopping({db, orders, paymentAuthority, audit = () => {}, clock = Date.now}) {
  const pricing = createPricingAuthority({db, audit});
  const now = () => new Date(clock()).toISOString();
  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {const result = fn(); db.exec('COMMIT'); return result;}
    catch (error) {db.exec('ROLLBACK'); throw error;}
  }
  function normalize(items) {
    if (!Array.isArray(items) || items.length > 50) fail(400, 'Use at most 50 cart items');
    const seen = new Set();
    const clean = items.map(item => {
      if (!item || typeof item.merchantId !== 'string' || !item.merchantId || item.merchantId.length > 128 ||
          typeof item.sku !== 'string' || !item.sku || item.sku.length > 128 ||
          !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 99) fail(400, 'Each item needs a merchant, SKU and quantity from 1 to 99');
      const key = JSON.stringify([item.merchantId, item.sku]);
      if (seen.has(key)) fail(400, 'Combine duplicate cart items');
      seen.add(key);
      return {merchantId: item.merchantId, sku: item.sku, qty: item.qty};
    });
    if (new Set(clean.map(x => x.merchantId)).size > 10) fail(400, 'Use at most 10 merchants per checkout');
    return clean.sort((a,b) => a.merchantId.localeCompare(b.merchantId) || a.sku.localeCompare(b.sku));
  }
  function rawCart(actor) {
    return db.prepare('SELECT * FROM shopping_carts WHERE owner_id=?').get(actor.id) || {version: 0, items: '[]', updated_at: null};
  }
  function expand(items, strict = false) {
    let total = 0;
    const lines = items.map(item => {
      const row = db.prepare(`SELECT c.title,c.active,m.business_name,m.status,i.quantity,i.unit_price,i.currency
        FROM commerce_catalog_items c JOIN commerce_merchants m ON m.id=c.merchant_id
        LEFT JOIN commerce_inventory i ON i.merchant_id=c.merchant_id AND i.sku=c.sku
        WHERE c.merchant_id=? AND c.sku=?`).get(item.merchantId, item.sku);
      let issue = !row || !row.active || row.status !== 'VERIFIED' ? 'Item is no longer available' :
        row.currency !== 'KES' || !Number.isSafeInteger(row.unit_price) ? 'Price is unavailable' :
        row.quantity < item.qty ? 'Not enough stock' : null;
      const unitPrice = row && row.active && row.status === 'VERIFIED' && row.currency === 'KES' ? row.unit_price : null;
      const amount = unitPrice === null ? null : unitPrice * item.qty;
      if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(total + amount))) issue = 'Amount is out of range';
      if (strict && issue) fail(409, (row?.title || item.sku) + ': ' + issue + '. Update your cart.');
      if (amount !== null && !issue) total += amount;
      return {...item, title: row?.title || item.sku, merchant: row?.business_name || 'Unavailable merchant',
        unitPrice, amount, available: row?.quantity ?? 0, issue};
    });
    return {items: lines, total: lines.some(x => x.issue) ? null : total, currency: 'KES'};
  }
  function cart(actor) {
    role(actor, 'customer');
    const row = rawCart(actor);
    return {version: row.version, updatedAt: row.updated_at, ...expand(JSON.parse(row.items))};
  }
  function saveCart(actor, data) {
    role(actor, 'customer');
    const items = normalize(data.items);
    return tx(() => {
      const row = rawCart(actor);
      if (data.version !== row.version) fail(409, 'Your cart changed in another window. Refresh it and try again.');
      db.prepare(`INSERT INTO shopping_carts VALUES(?,?,?,?) ON CONFLICT(owner_id)
        DO UPDATE SET version=excluded.version,items=excluded.items,updated_at=excluded.updated_at`)
        .run(actor.id, row.version + 1, JSON.stringify(items), now());
      return cart(actor);
    });
  }
  function review(actor, data) {
    role(actor, 'customer');
    return tx(() => {
      const row = rawCart(actor);
      if (data.version !== row.version) fail(409, 'Your cart changed. Refresh it before review.');
      const items = JSON.parse(row.items);
      if (!items.length) fail(400, 'Add an item before checkout');
      const snapshot = expand(items, true), id = randomUUID(), expiresAt = new Date(clock() + 600000).toISOString();
      // Completed reviews are retained as immutable order descriptions; only unused expired reviews are discarded.
      db.prepare('DELETE FROM shopping_reviews WHERE owner_id=? AND checkout_id IS NULL AND expires_at<?').run(actor.id, now());
      db.prepare('INSERT INTO shopping_reviews VALUES(?,?,?,?,?,NULL,?)').run(id, actor.id, row.version, JSON.stringify(snapshot), expiresAt, now());
      return {id, version: row.version, expiresAt, ...snapshot, stockReserved: false};
    });
  }
  function checkout(actor, data) {
    role(actor, 'customer');
    if (typeof data.reviewId !== 'string') fail(400, 'Review your cart before checkout');
    return tx(() => {
      const r = db.prepare('SELECT * FROM shopping_reviews WHERE id=? AND owner_id=?').get(data.reviewId, actor.id);
      if (!r) fail(404, 'Checkout review not found');
      if (r.checkout_id) return {...getCheckout(actor, r.checkout_id), duplicate: true};
      const row = rawCart(actor);
      if (r.expires_at <= now()) fail(409, 'Your checkout review expired. Review the cart again.');
      if (row.version !== r.cart_version) fail(409, 'Your cart changed. Review it again.');
      const snapshot = JSON.parse(r.snapshot), current = expand(JSON.parse(row.items), true);
      // Compare each price, not just the grand total: offsetting changes also require new consent.
      if (JSON.stringify(current.items.map(x => [x.merchantId,x.sku,x.qty,x.unitPrice])) !==
          JSON.stringify(snapshot.items.map(x => [x.merchantId,x.sku,x.qty,x.unitPrice]))) fail(409, 'Prices changed. Review the cart again.');
      const id = randomUUID(), time = now();
      db.prepare("INSERT INTO commerce_checkouts VALUES(?,?,'CONFIRMED',?,'KES',?,?,?)")
        .run(id, actor.id, current.total, 'cart-review:' + r.id, time, time);
      for (const merchantId of new Set(current.items.map(x => x.merchantId))) {
        const lines = current.items.filter(x => x.merchantId === merchantId);
        const order = orders.createInsideTransaction({customerId: actor.id, merchantId,
          basket: lines.map(x => ({sku: x.sku, qty: x.qty})), total: lines.reduce((sum,x) => sum + x.amount,0),
          currency: 'KES', idempotencyKey: 'cart-review:' + r.id + ':' + merchantId, actor});
        db.prepare('INSERT INTO commerce_checkout_orders VALUES(?,?,?)').run(id, order.id, merchantId);
      }
      db.prepare('UPDATE shopping_reviews SET checkout_id=? WHERE id=?').run(id, r.id);
      db.prepare("UPDATE shopping_carts SET items='[]',version=version+1,updated_at=? WHERE owner_id=?").run(time, actor.id);
      audit(actor, 'shopping.checkout_created', id, {reviewId: r.id, total: current.total});
      return getCheckout(actor, id);
    });
  }
  function orderView(order) {
    const snapshot = db.prepare(`SELECT r.snapshot FROM shopping_reviews r JOIN commerce_checkout_orders b ON b.checkout_id=r.checkout_id WHERE b.order_id=?`).get(order.id);
    const lines = snapshot ? JSON.parse(snapshot.snapshot).items.filter(x => x.merchantId === order.merchant_id) :
      JSON.parse(order.basket).map(x => ({sku: x.sku, qty: x.qty, title: x.sku}));
    const payment = db.prepare('SELECT id,amount,currency,status FROM commerce_payments WHERE order_id=?').get(order.id) || null;
    const shipment = db.prepare(`SELECT s.id,s.status FROM commerce_order_shipments b
      JOIN logistics_shipments s ON s.id=b.shipment_id WHERE b.order_id=?`).get(order.id) || null;
    return {id: order.id, merchantId: order.merchant_id,
      merchant: db.prepare('SELECT business_name FROM commerce_merchants WHERE id=?').get(order.merchant_id)?.business_name || 'Merchant',
      status: order.status, total: order.total, currency: order.currency, createdAt: order.created_at, items: lines, payment, shipment};
  }
  function getCheckout(actor, id) {
    role(actor, 'customer');
    const row = db.prepare('SELECT id,status,total,currency,created_at FROM commerce_checkouts WHERE id=? AND customer_id=?').get(id, actor.id);
    if (!row) fail(404, 'Checkout not found');
    return {checkout: row, orders: db.prepare(`SELECT o.* FROM commerce_checkout_orders b JOIN commerce_orders o ON o.id=b.order_id
      WHERE b.checkout_id=? ORDER BY o.merchant_id`).all(id).map(orderView)};
  }
  function history(actor, offset = 0) {
    role(actor, 'customer');
    if (!Number.isSafeInteger(offset) || offset < 0) fail(400, 'Invalid history offset');
    const rows = db.prepare('SELECT id FROM commerce_checkouts WHERE customer_id=? ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET ?').all(actor.id, offset);
    return {checkouts: rows.slice(0,20).map(x => getCheckout(actor,x.id)), nextOffset: rows.length > 20 ? offset + 20 : null};
  }
  function merchantOrder(actor, id) {
    role(actor, 'agent', 'admin');
    const order = orders.get(id);
    if (!order || actor.role !== 'admin' && order.merchant_id !== actor.id) fail(404, 'Order not found');
    return order;
  }
  function merchantOrders(actor) {
    role(actor, 'agent', 'admin');
    const rows = actor.role === 'admin' ? db.prepare('SELECT * FROM commerce_orders ORDER BY created_at DESC LIMIT 100').all() :
      db.prepare('SELECT * FROM commerce_orders WHERE merchant_id=? ORDER BY created_at DESC LIMIT 100').all(actor.id);
    return {orders: rows.map(orderView)};
  }
  function preparePayment(actor, id) {
    let order = merchantOrder(actor,id);
    if (!['DRAFT','VALIDATED','PRICE_CONFIRMED','PAYMENT_PENDING'].includes(order.status)) fail(409, 'This order cannot be prepared for payment');
    const snapshot = db.prepare(`SELECT r.snapshot FROM shopping_reviews r JOIN commerce_checkout_orders b ON b.checkout_id=r.checkout_id WHERE b.order_id=?`).get(id);
    const current = expand(JSON.parse(order.basket).map(x => ({merchantId: order.merchant_id, ...x})), true);
    if (current.total !== order.total || snapshot && current.items.some(x =>
      JSON.parse(snapshot.snapshot).items.find(y => y.merchantId === x.merchantId && y.sku === x.sku)?.unitPrice !== x.unitPrice))
      fail(409, 'Prices changed since checkout. Do not collect payment; the customer must place a newly reviewed order.');
    // Resumable steps use the existing authorities; no customer or merchant can mark a payment as received.
    if (order.status === 'DRAFT') order = orders.transition({orderId:id,to:'VALIDATED',actor});
    if (order.status === 'VALIDATED') {pricing.confirm({orderId:id,actor}); order = orders.get(id);}
    if (order.status === 'PRICE_CONFIRMED') orders.transition({orderId:id,to:'PAYMENT_PENDING',actor});
    paymentAuthority.createCommercePayment({orderId:id,actor});
    return orderView(orders.get(id));
  }
  function verifyPayment(actor, id, data) {
    role(actor,'admin');
    merchantOrder(actor,id);
    const payment = db.prepare('SELECT * FROM commerce_payments WHERE order_id=?').get(id);
    if (!payment) fail(409, 'Prepare this order for payment first');
    paymentAuthority.verifyCommerceManual({paymentId:payment.id,reference:data.reference,amount:data.amount,actor});
    if (orders.get(id).status === 'PAYMENT_PENDING') orders.confirmPayment({orderId:id,actor});
    return orderView(orders.get(id));
  }
  function routes({path,method,user,body,send,url}) {
    let match;
    if (path === '/api/rideplate/cart' && method === 'GET') {send(200,cart(user)); return true;}
    if (path === '/api/rideplate/cart' && method === 'PUT') {send(200,saveCart(user,body)); return true;}
    if (path === '/api/rideplate/cart/review' && method === 'POST') {send(201,review(user,body)); return true;}
    if (path === '/api/rideplate/cart/checkout' && method === 'POST') {send(201,checkout(user,body)); return true;}
    if (path === '/api/rideplate/checkouts' && method === 'GET') {send(200,history(user,Number(url.searchParams.get('offset') || 0))); return true;}
    if ((match = path.match(/^\/api\/rideplate\/checkouts\/([^/]+)$/)) && method === 'GET') {send(200,getCheckout(user,match[1])); return true;}
    if (path === '/api/rideplate/merchant-orders' && method === 'GET') {send(200,merchantOrders(user)); return true;}
    if ((match = path.match(/^\/api\/rideplate\/merchant-orders\/([^/]+)\/(prepare|verify)$/)) && method === 'POST') {
      try {send(200,match[2] === 'prepare' ? preparePayment(user,match[1]) : verifyPayment(user,match[1],body));}
      catch (error) {if (!error.status && error.code && !error.code.startsWith('SQLITE')) error.status = 409; throw error;}
      return true;
    }
    return false;
  }
  return {cart,saveCart,review,checkout,getCheckout,history,merchantOrders,preparePayment,verifyPayment,routes};
}
module.exports = {createShopping};
