(() => {
  'use strict';
  const R = window.R2V, {api,node,button,status,perform} = R;
  let generation = 0;
  const money = value => 'KES ' + Number(value).toLocaleString();
  const label = value => String(value || '').replaceAll('_',' ').toLowerCase();
  async function refresh(root, user) {
    const token = ++generation;
    const active = () => token === generation && R.getUser()?.id === user?.id && root.isConnected;
    if (!user || !['customer','agent','admin'].includes(user.role)) return;
    const panel = node('details',null,'shopping-panel'); panel.open = true;
    panel.id = 'shopping-panel';
    panel.append(node('summary',user.role === 'customer' ? 'Ride Plate • shop, cart & orders' : 'Ride Plate orders'));
    root.append(panel);
    if (user.role !== 'customer') {
      const result = await api('/rideplate/merchant-orders'); if (!active()) return;
      panel.append(node('p','Latest 100 orders. Verify only payments actually received. Customer totals cover catalog items; arrange any delivery separately before collection.'));
      if (!result.orders.length) panel.append(node('p','No merchant orders yet.'));
      for (const order of result.orders) {
        const card = orderCard(order); panel.append(card);
        if (['DRAFT','VALIDATED','PRICE_CONFIRMED','PAYMENT_PENDING'].includes(order.status) && !order.payment) {
          card.append(button('Prepare order for payment',async () => {
            await api('/rideplate/merchant-orders/' + order.id + '/prepare','POST',{});
            if (active()) {status('Payment record prepared. Confirm collection instructions with the customer.'); await window.R2VMarketplace.refresh(R.getUser());}
          }));
        }
        if (user.role === 'admin' && (order.payment?.status === 'pending' || order.payment?.status === 'paid' && order.status === 'PAYMENT_PENDING')) {
          const form = node('form'), refLabel = node('label','Received transaction reference'), ref = node('input');
          ref.name = 'reference'; ref.required = true; ref.pattern = '[A-Za-z0-9_-]{6,80}'; refLabel.append(ref);
          const amountLabel = node('label','Received amount KES'), amount = node('input');
          amount.name = 'amount'; amount.type = 'number'; amount.required = true; amount.min = '0'; amount.step = '1'; amountLabel.append(amount);
          const submit = node('button','Verify received order payment'); submit.type = 'submit';
          form.append(refLabel,amountLabel,submit);
          form.addEventListener('submit',event => {event.preventDefault(); perform(async () => {
            await api('/rideplate/merchant-orders/' + order.id + '/verify','POST',{reference:ref.value,amount:Number(amount.value)});
            if (active()) {status('Received payment verified.'); await window.R2VMarketplace.refresh(R.getUser());}
          },submit);}); card.append(form);
        }
      }
      return;
    }
    const [catalog,initialCart,initialHistory] = await Promise.all([api('/rideplate/catalog'),api('/rideplate/cart'),api('/rideplate/checkouts')]);
    if (!active()) return;
    let cart = initialCart, review = null, busy = false, history = initialHistory.checkouts, nextOffset = initialHistory.nextOffset;
    const catalogBox = node('div',null,'dashboard-grid shop-catalog'), cartBox = node('div'), reviewBox = node('div'), historyBox = node('div');
    const feedback = node('p'); feedback.setAttribute('role','alert'); feedback.hidden = true;
    cartBox.id = 'shopping-cart'; reviewBox.id = 'shopping-review'; historyBox.id = 'shopping-history';
    panel.append(node('p','Shop verified merchant inventory. Your cart is saved to your account.'),catalogBox,feedback,cartBox,reviewBox,historyBox);
    async function mutate(fn) {
      if (busy || !active()) return;
      busy = true; feedback.hidden = true; panel.setAttribute('aria-busy','true');
      panel.querySelectorAll('button,input').forEach(x => {x.disabled = true;});
      try {await fn();}
      catch (error) {
        if (active()) {
          review = null; feedback.hidden = false; feedback.className = 'shopping-warning'; feedback.textContent = error.message;
          feedback.scrollIntoView({block:'nearest'});
          try {cart = await api('/rideplate/cart');} catch { /* Keep the last confirmed cart visible if offline. */ }
        }
        throw error;
      } finally {
        busy = false;
        if (active()) {panel.removeAttribute('aria-busy'); panel.querySelectorAll('button,input').forEach(x => {x.disabled = false;}); renderCart(); renderReview(); renderHistory();}
      }
    }
    const entries = () => cart.items.map(({merchantId,sku,qty}) => ({merchantId,sku,qty}));
    async function save(items) {cart = await api('/rideplate/cart','PUT',{version:cart.version,items}); review = null;}
    if (!catalog.items.length) catalogBox.append(node('p','No available merchant inventory yet. Your existing orders remain below.'));
    for (const item of catalog.items) {
      const card = node('article',null,'app-card');
      card.append(node('span',item.category || 'Marketplace','dashboard-eyebrow'),node('h3',item.title),node('p',item.business_name),
        node('p',item.description || ''),node('strong',money(item.unit_price)),node('p',item.quantity + ' available'),
        button('Add one',() => mutate(async () => {
          const items = entries(), line = items.find(x => x.merchantId === item.merchant_id && x.sku === item.sku);
          if (line) line.qty++; else items.push({merchantId:item.merchant_id,sku:item.sku,qty:1});
          await save(items); if (active()) status(item.title + ' saved to your cart.');
        })));
      catalogBox.append(card);
    }
    function renderCart() {
      cartBox.replaceChildren(node('h3','Your saved cart'));
      if (!cart.items.length) {cartBox.append(node('p','Your cart is empty. Choose an item above to get started.')); return;}
      for (const item of cart.items) {
        const card = node('article',null,'app-card cart-line'), qtyLabel = node('label','Quantity for ' + item.title), qty = node('input');
        qty.type = 'number'; qty.min = '1'; qty.max = '99'; qty.step = '1'; qty.value = item.qty; qtyLabel.append(qty);
        card.append(node('h4',item.title),node('p',item.merchant + (item.unitPrice === null ? '' : ' · ' + money(item.unitPrice) + ' each')),qtyLabel,
          button('Update quantity',() => mutate(async () => {
            const items = entries(); items.find(x => x.merchantId === item.merchantId && x.sku === item.sku).qty = Number(qty.value); await save(items);
          })),button('Remove item',() => mutate(() => save(entries().filter(x => !(x.merchantId === item.merchantId && x.sku === item.sku))))));
        if (item.issue) card.append(node('p',item.issue,'shopping-warning'));
        else card.append(node('strong',money(item.amount)));
        cartBox.append(card);
      }
      cartBox.append(node('p',cart.total === null ? 'Resolve unavailable items before checkout.' : 'Catalog items total: ' + money(cart.total)),
        button('Review checkout',() => mutate(async () => {review = await api('/rideplate/cart/review','POST',{version:cart.version});})),
        button('Refresh cart',() => mutate(async () => {cart = await api('/rideplate/cart'); review = null;})));
    }
    function renderReview() {
      reviewBox.replaceChildren(); if (!review) return;
      reviewBox.append(node('h3','Review your checkout'));
      for (const merchantId of new Set(review.items.map(x => x.merchantId))) {
        const lines = review.items.filter(x => x.merchantId === merchantId), card = node('article',null,'app-card');
        card.append(node('h4',lines[0].merchant));
        for (const line of lines) card.append(node('p',line.qty + ' × ' + line.title + ' · ' + money(line.amount)));
        card.append(node('strong','Merchant subtotal: ' + money(lines.reduce((sum,x) => sum + x.amount,0)))); reviewBox.append(card);
      }
      const currentReview = review;
      reviewBox.append(node('p','Catalog items total: ' + money(review.total)),
        node('p','No payment is taken now. Stock is checked again when you place the order but is not reserved until merchant processing. Delivery arrangements and any separate delivery charge must be agreed before payment.'),
        node('p','Review expires ' + new Date(review.expiresAt).toLocaleTimeString() + '. Prices cannot change without a new review.'),
        button('Place reviewed order',() => mutate(async () => {
          const result = await api('/rideplate/cart/checkout','POST',{reviewId:currentReview.id});
          cart = await api('/rideplate/cart'); review = null;
          const resultHistory = await api('/rideplate/checkouts'); history = resultHistory.checkouts; nextOffset = resultHistory.nextOffset;
          if (active()) status('Order saved: ' + money(result.checkout.total) + '. Follow its payment status in order history.');
        })));
    }
    function renderHistory() {
      historyBox.replaceChildren(node('h3','Your order history'),button('Refresh orders',() => mutate(async () => {
        const result = await api('/rideplate/checkouts'); history = result.checkouts; nextOffset = result.nextOffset;
      })));
      if (!history.length) historyBox.append(node('p','No orders yet. Completed checkout will appear here.'));
      for (const record of history) {
        const detail = node('details'); detail.open = record.orders.some(x => !x.payment || x.payment.status === 'pending');
        detail.append(node('summary',new Date(record.checkout.created_at).toLocaleString() + ' · ' + money(record.checkout.total)));
        for (const order of record.orders) detail.append(orderCard(order));
        detail.append(button('Reopen order status',() => mutate(async () => {
          const current = await api('/rideplate/checkouts/' + record.checkout.id);
          history = history.map(x => x.checkout.id === record.checkout.id ? current : x);
          if (active()) status('Latest payment and fulfilment status loaded.');
        })));
        historyBox.append(detail);
      }
      if (nextOffset !== null) historyBox.append(button('Load older orders',() => mutate(async () => {
        const result = await api('/rideplate/checkouts?offset=' + nextOffset); history.push(...result.checkouts); nextOffset = result.nextOffset;
      })));
    }
    renderCart(); renderReview(); renderHistory();
  }
  function orderCard(order) {
    const card = node('article',null,'app-card order-card'); card.dataset.orderId = order.id;
    card.append(node('h4',order.merchant),node('p','Order ' + order.id),node('strong',money(order.total)),
      node('p','Order status: ' + label(order.status)),node('p','Payment: ' + (order.payment ? label(order.payment.status) : 'awaiting merchant confirmation')));
    for (const item of order.items) card.append(node('p',item.qty + ' × ' + item.title));
    if (order.payment?.status === 'pending') card.append(node('p','Payment pending. Obtain collection instructions from operations, quoting this order ID. Online Ride Plate payment collection is not connected.'));
    card.append(node('p',order.shipment ? 'Fulfilment: ' + label(order.shipment.status) : 'Fulfilment: not assigned'));
    return card;
  }
  window.R2VShopping = {refresh,clear:() => {generation++;}};
})();
