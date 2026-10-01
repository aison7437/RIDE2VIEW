const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createApp } = require('../server/app');
(async()=>{
 const app=createApp({dbPath:':memory:',adminEmail:'admin@example.test',adminPassword:'Administrator-Test-Only-42'});
 let browser;
 try {
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
  async function call(path,body,cookie,method='POST'){const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});assert(r.ok,await r.clone().text());return {data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  const admin=(await call('/auth/login',{email:'admin@example.test',password:'Administrator-Test-Only-42'})).cookie;
  const customer={email:'customer@example.test',name:'Customer Test',password:'Customer-Test-Only-42',role:'customer'};
  const driver={email:'driver@example.test',name:'Driver Test',password:'Driver-Test-Only-42',role:'driver'};
  await call('/auth/register',customer);const registered=await call('/auth/register',driver);await call('/admin/users/'+registered.data.id+'/approve',{},admin);
  const listing=await call('/listings',{title:'Kilimani 2 bedroom',description:'A Nairobi property for viewing',price:45000,location:{city:'Nairobi'},property:{bedrooms:2},timing:{duration:45}},admin);
  await call('/listings/'+listing.data.id,{approved:true},admin,'PATCH');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const errors=[];
  async function pageFor(email,password){const context=await browser.newContext();await context.route('https://**/*',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>document.getElementById('app-status').textContent.startsWith('Ready.'));await page.locator('#app-auth-form [name=email]').fill(email);await page.locator('#app-auth-form [name=password]').fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForFunction(()=>!document.getElementById('app-account').hidden);return page;}
  const client=await pageFor(customer.email,customer.password);
  await client.locator('#app-search [name=message]').fill('Find a 2 bedroom property in Nairobi');await client.locator('#app-search [name=availableTime]').fill('1 hour');await client.locator('#app-search button').filter({hasText:/^Search$/}).click();await client.getByRole('button',{name:'Choose property',exact:true}).click();
  await client.locator('#app-booking-form [name=scheduledAt]').fill('2030-01-01T10:00');await client.getByRole('button',{name:'Request viewing',exact:true}).click();await client.waitForFunction(()=>document.getElementById('app-bookings').textContent.includes('Payment: pending'));
  const operations=await pageFor('admin@example.test','Administrator-Test-Only-42');await operations.getByLabel('Transaction reference').fill('BROWSER_RECEIPT_001');await operations.getByRole('button',{name:'Verify received payment',exact:true}).click();await operations.getByRole('button',{name:'Offer viewing to driver',exact:true}).click();const offered=app.db.prepare("SELECT * FROM dispatch_assignments WHERE booking_id=(SELECT id FROM bookings ORDER BY created_at DESC LIMIT 1) AND status='OFFERED'").get();assert(offered);require('../server/mobility/dispatch').createDispatchAuthority({db:app.db}).accept({assignmentId:offered.id,driverId:registered.data.id,actor:{id:registered.data.id,role:'driver'}});await operations.getByRole('button',{name:'Refresh status',exact:true}).click();await operations.waitForFunction(()=>document.getElementById('app-bookings').textContent.includes('Status: assigned'));
  const driverPage=await pageFor(driver.email,driver.password);await driverPage.getByRole('button',{name:'Complete viewing',exact:true}).click();await driverPage.waitForFunction(()=>document.getElementById('app-bookings').textContent.includes('Status: completed'));
  await client.getByRole('button',{name:'Refresh status',exact:true}).click();await client.waitForFunction(()=>document.getElementById('app-bookings').textContent.includes('Status: completed'));
  await client.setViewportSize({width:390,height:844});assert(await client.locator('#app-workspace').isVisible());assert.equal(await client.evaluate(()=>{const e=document.getElementById('app-workspace');return e.scrollWidth>e.clientWidth;}),false);
  await client.getByRole('button',{name:'View design preview',exact:true}).click();await client.getByRole('button',{name:'Open booking workspace',exact:true}).click();
  await client.getByRole('button',{name:'Voice search',exact:true}).click();assert(await client.locator('#voice-overlay').isVisible());await client.locator('#app-voice-close').click();
  assert.deepEqual(errors,[]);console.log('Browser journey passed: search → choose → book → verify → assign → complete; mobile and voice controls passed.');
 } finally {if(browser)await browser.close();await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
