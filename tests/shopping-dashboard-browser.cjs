const assert=require('node:assert/strict'),{chromium}=require('playwright'),{createApp}=require('../server/app');
const {profileData}=require('./helpers/mobility.cjs');
const {pdf,expiry}=require('./helpers/supply.cjs');
const {REQUIRED}=require('../server/mobility/onboarding/authority');
(async()=>{
 const app=createApp({dbPath:':memory:',adminEmail:'admin@shopping.test',adminPassword:'Shopping-Administrator-1234',startOperationsRuntime:false,startSideEffectRuntime:false});let browser;
 try {
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
  const accounts={};
  for(const [name,role] of [['Buyer','customer'],['Other','customer'],['Shop','agent'],['Driver','driver']]){
   const data={name,email:name.toLowerCase()+'@shopping.test',password:'Shopping-Password-1234',role};
   const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(response.status,201);accounts[name]={...data,...await response.json()};
  }
  const admin=app.db.prepare("SELECT id,role FROM users WHERE role='admin'").get(),merchant=accounts.Shop,buyer=accounts.Buyer,driver=accounts.Driver;
  app.expansion.merchant(merchant,{businessName:'Synthetic Green Kitchen'});app.expansion.verifyMerchant(admin,merchant.id);
  app.expansion.item(merchant,{sku:'meal',title:'Synthetic lunch',category:'food',quantity:10,unitPrice:500});
  const property=app.supply.createListing(admin,{title:'Synthetic Nairobi home',description:'Browser test listing',price:45000,location:{city:'Nairobi'},property:{bedrooms:2}});
  app.db.prepare('UPDATE listings SET approved=1 WHERE id=?').run(property.id);app.db.prepare("UPDATE supply_checks SET status='APPROVED',expires_at=? WHERE target_id=?").run(new Date(Date.now()+86400000).toISOString(),property.id);
  app.onboarding.profile(driver,{...profileData,revision:0});
  const docs=REQUIRED.map(kind=>app.onboarding.document(driver,{kind,name:kind+'.pdf',mime:'application/pdf',data:pdf,expiresAt:expiry()}).id);
  const check=app.onboarding.submit(driver,'driver',{documentIds:docs,adultConfirmed:true});
  app.onboarding.review(admin,driver.id,'driver',{revision:check.revision,decision:'APPROVED',reason:'Synthetic reviewed driver',adultVerified:true,expiresAt:new Date(Date.now()+180*86400000).toISOString()});
  app.onboarding.availability(driver,{online:true});
  browser=await chromium.launch({headless:true,executablePath:process.env.R2V_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  const errors=[];
  async function pageFor(account){const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('https://**/*',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await login(page,account);return page;}
  async function login(page,account){await page.goto(base);await page.locator('#app-auth-form [name=email]').fill(account.email);await page.locator('#app-auth-form [name=password]').fill(account.password);await page.locator('#app-auth-form').getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('#app-agents').getByRole('button',{name:'Run assessment',exact:true}).waitFor();}
  const page=await pageFor(buyer),shop=page.locator('#shopping-panel');
  await page.locator('#account-overview').getByRole('heading',{name:'Welcome, Buyer'}).waitFor();
  assert((await page.locator('#account-overview').textContent()).includes('Synthetic Nairobi home'));
  await page.locator('#account-overview').getByRole('button',{name:'Explore this property'}).click();await page.locator('#app-results').getByRole('heading',{name:'Synthetic Nairobi home'}).waitFor();
  await shop.getByRole('button',{name:'Add one',exact:true}).click();await page.locator('#shopping-cart').getByLabel('Quantity for Synthetic lunch').waitFor();
  await page.reload();await page.locator('#shopping-cart').getByLabel('Quantity for Synthetic lunch').waitFor();assert.equal(await page.locator('#shopping-cart input').inputValue(),'1');
  await page.locator('#shopping-cart input').fill('3');await shop.getByRole('button',{name:'Update quantity',exact:true}).click();await page.waitForFunction(()=>document.getElementById('shopping-cart').textContent.includes('1,500'));
  await shop.getByRole('button',{name:'Remove item',exact:true}).click();await page.locator('#shopping-cart').getByText('Your cart is empty. Choose an item above to get started.').waitFor();
  await shop.getByRole('button',{name:'Add one',exact:true}).click();await shop.getByRole('button',{name:'Review checkout',exact:true}).click();await page.locator('#shopping-review').getByRole('heading',{name:'Review your checkout'}).waitFor();
  app.commerceInventory.setStock({merchantId:merchant.id,sku:'meal',quantity:10,unitPrice:600,actor:merchant});
  await shop.getByRole('button',{name:'Place reviewed order',exact:true}).click();await page.waitForFunction(()=>document.getElementById('app-status').textContent.includes('Prices changed'));
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM commerce_orders').get().n,0);
  await shop.getByRole('button',{name:'Review checkout',exact:true}).click();await shop.getByRole('button',{name:'Place reviewed order',exact:true}).click();
  await page.locator('#shopping-history .order-card').waitFor();assert.equal(app.db.prepare('SELECT COUNT(*) n FROM commerce_orders').get().n,1);
  const orderId=app.db.prepare('SELECT id FROM commerce_orders').get().id;
  const merchantPage=await pageFor(merchant);await merchantPage.locator('#shopping-panel').getByRole('button',{name:'Prepare order for payment',exact:true}).click();
  await merchantPage.waitForFunction(()=>document.querySelector('#shopping-panel .order-card')?.textContent.includes('Payment: pending'));
  const adminPage=await pageFor({email:'admin@shopping.test',password:'Shopping-Administrator-1234'}),order=adminPage.locator('#shopping-panel [data-order-id="'+orderId+'"]');
  await order.getByLabel('Received transaction reference').fill('BROWSER_ORDER_PAID');await order.getByLabel('Received amount KES').fill('600');await order.getByRole('button',{name:'Verify received order payment',exact:true}).click();
  await adminPage.waitForFunction(()=>document.querySelector('#shopping-panel .order-card')?.textContent.includes('Payment: paid'));
  await shop.getByRole('button',{name:'Reopen order status',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#shopping-history .order-card')?.textContent.includes('Payment: paid'));
  await page.setViewportSize({width:390,height:844});await page.locator('#account-overview').getByRole('button',{name:'Refresh dashboard',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('account-overview').textContent.includes('Ride Plate checkouts'));
  for(const selector of ['#app-workspace','#account-overview','#shopping-panel'])assert.equal(await page.locator(selector).evaluate(e=>e.scrollWidth>e.clientWidth),false,selector+' overflows mobile');
  await page.evaluate(()=>document.getElementById('app-workspace').scrollTo(0,0));
  if(process.env.R2V_SCREENSHOT_DIR)await page.screenshot({path:process.env.R2V_SCREENSHOT_DIR+'/client-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});if(process.env.R2V_SCREENSHOT_DIR)await page.screenshot({path:process.env.R2V_SCREENSHOT_DIR+'/client-desktop.png'});
  // An old dashboard response must never reappear after logout/account switching.
  let release,received;const held=new Promise(r=>{received=r;});
  await page.route('**/api/dashboard',async route=>{const response=await route.fetch();received();await new Promise(r=>{release=r;});await route.fulfill({response});},{times:1});
  await page.locator('#account-overview').getByRole('button',{name:'Refresh dashboard',exact:true}).click();await held;
  await page.locator('#app-logout').click();await page.locator('#app-auth-form').waitFor();release();
  await page.waitForFunction(()=>document.getElementById('account-overview').hidden&&document.getElementById('account-overview').textContent==='');
  await login(page,accounts.Other);assert(!(await page.locator('#shopping-history').textContent()).includes(orderId));assert.equal(await page.locator('#shopping-cart input').count(),0);
  const driverPage=await pageFor(driver),overview=driverPage.locator('#account-overview');
  await overview.getByRole('button',{name:'Set availability: offline',exact:true}).click();await overview.getByRole('button',{name:'Set availability: online',exact:true}).waitFor();
  await overview.getByRole('button',{name:'Set availability: online',exact:true}).click();await overview.getByRole('button',{name:'Set availability: offline',exact:true}).waitFor();
  app.rides.policy(admin,{label:'Synthetic fares',baseKES:{general:650,women:750,students:450,vip:2000},perKmKES:7,returnPercent:50,waitingKESPerTwoMinutes:20,waitingGraceMinutes:5});
  let ride=app.rides.create(buyer,{pickup:'Nairobi pickup',destination:'Nairobi destination',phone:'+254700000000',tier:'general',passengers:1,returnJourney:false,scheduledAt:new Date(Date.now()+86400000).toISOString(),idempotencyKey:'browser-driver-dashboard'});
  ride=app.rides.quote(admin,ride.id,{version:ride.version,distanceMetres:2000,minutes:15,waitingMinutes:0,evidenceRef:'Synthetic route review'});
  ride=app.rides.accept(buyer,ride.id,{version:ride.version,acceptPolicy:true});app.rides.verify(admin,ride.id,{amount:ride.payment.amount,reference:'BROWSER_RIDE_PAID'});app.rides.offer(admin,ride.id,{driverId:driver.id,idempotencyKey:'dashboard-offer'});
  await overview.getByRole('button',{name:'Refresh dashboard',exact:true}).click();await overview.getByRole('button',{name:'Accept ride offer',exact:true}).click();
  await driverPage.waitForFunction(()=>document.getElementById('account-overview').textContent.includes('Nairobi pickup → Nairobi destination · assigned'));
  assert.equal(app.rides.get(driver,ride.id).status,'ASSIGNED');
  await overview.getByRole('button',{name:'Open driver coach',exact:true}).click();assert.equal(await driverPage.locator('#app-agents [name=workflow]').inputValue(),'driver-coach');
  await driverPage.evaluate(()=>document.getElementById('app-workspace').scrollTo(0,0));if(process.env.R2V_SCREENSHOT_DIR)await driverPage.screenshot({path:process.env.R2V_SCREENSHOT_DIR+'/driver-desktop.png'});
  await driverPage.setViewportSize({width:390,height:844});for(const selector of ['#app-workspace','#account-overview'])assert.equal(await driverPage.locator(selector).evaluate(e=>e.scrollWidth>e.clientWidth),false,selector+' overflows driver mobile');
  if(process.env.R2V_SCREENSHOT_DIR)await driverPage.screenshot({path:process.env.R2V_SCREENSHOT_DIR+'/driver-mobile.png'});
  assert.deepEqual(errors,[]);console.log('Shopping/dashboard browser: persisted cart, edits/removal, price change, checkout, payment history, customer isolation, delayed logout response, real driver availability/offers and mobile layout passed.');
 } finally {if(browser)await browser.close();await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
