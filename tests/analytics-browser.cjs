const assert=require('node:assert/strict'),{chromium}=require('playwright'),{createApp}=require('../server/app');
(async()=>{const app=createApp({dbPath:':memory:',adminEmail:'admin@analytics.test',adminPassword:'Test-Administrator-1234',startOperationsRuntime:false,startSideEffectRuntime:false});let browser;
 try{
  const time=new Date(Date.now()-2*86400000).toISOString();app.db.prepare("INSERT INTO support_cases(id,incident_type,severity,status,idempotency_key,created_at,updated_at) VALUES('support-browser','PAYMENT_FAILED','HIGH','OPEN','support-browser',?,?)").run(time,time);
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.R2V_CHROMIUM_EXECUTABLE?{executablePath:process.env.R2V_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.locator('#app-auth-form [name=email]').fill('admin@analytics.test');await page.locator('#app-auth-form [name=password]').fill('Test-Administrator-1234');await page.locator('#app-auth-form').getByRole('button',{name:'Sign in',exact:true}).click();
  const panel=page.locator('#app-analytics');await panel.getByRole('button',{name:'Generate operations report',exact:true}).click();await panel.getByText('Unresolved support cases needing attention: 1 · HIGH',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Inspect unresolved support cases needing attention',exact:true}).click();await panel.getByRole('cell',{name:'support-browser',exact:true}).waitFor();
  const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10);await panel.locator('[name=from]').fill(today);await panel.locator('[name=to]').fill(today);await panel.getByRole('button',{name:'Generate operations report',exact:true}).click();await panel.getByText('No records match the current review rules. This does not establish that every workflow is healthy.',{exact:true}).waitFor();
  await page.reload();await panel.getByText('No records match the current review rules. This does not establish that every workflow is healthy.',{exact:true}).waitFor();assert.equal(await panel.locator('[name=from]').inputValue(),today);
  await page.setViewportSize({width:390,height:844});assert.equal(await panel.evaluate(e=>e.scrollWidth>e.clientWidth),false);
  await page.locator('#app-logout').click();await page.waitForFunction(()=>document.getElementById('app-analytics').hidden);assert.equal(await panel.textContent(),'');assert.deepEqual(errors,[]);console.log('Analytics browser: admin report, friction evidence, date filters, saved snapshot, mobile width and logout privacy passed.');
 }finally{if(browser)await browser.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
