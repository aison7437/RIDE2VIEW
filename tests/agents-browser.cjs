const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createApp}=require('../server/app');
(async()=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false});let browser;
 try{
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.R2V_CHROMIUM_EXECUTABLE?{executablePath:process.env.R2V_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const role of ['customer','agent','driver']){
   const email=role+'@agents.test',password='Synthetic-Password-1234';
   const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test '+role,email,password,role})});assert.equal(response.status,201);
   await page.goto(base);await page.locator('#app-auth-form [name=email]').fill(email);await page.locator('#app-auth-form [name=password]').fill(password);await page.locator('#app-auth-form').getByRole('button',{name:'Sign in',exact:true}).click();
   const root=page.locator('#app-agents');await root.getByRole('button',{name:'Run assessment',exact:true}).waitFor();
   await root.getByRole('button',{name:'Run assessment',exact:true}).click();await root.locator('[data-workflow-id]').waitFor();
   assert(await root.getByRole('button',{name:'Mark reviewed',exact:true}).isVisible());await root.getByRole('button',{name:'Mark reviewed',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#app-agents [data-workflow-id] > summary')?.textContent.endsWith('reviewed'));
   await page.reload();await root.locator('[data-workflow-id]').waitFor();assert.match(await root.locator('[data-workflow-id] > summary').textContent(),/reviewed/);
   if(role==='customer'){
    await root.getByLabel('Choose assistant').selectOption('experiences');await root.getByRole('button',{name:'Run assessment',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#app-agents [data-workflow-id]').length===2);
   }
   await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>{const e=document.getElementById('app-agents');return e.scrollWidth>e.clientWidth;}),false);
   await page.locator('#app-logout').click();await page.waitForFunction(()=>document.getElementById('app-agents').hidden);assert.equal(await root.locator('[data-workflow-id]').count(),0);
  }
  assert.deepEqual(errors,[]);console.log('Agent browser: customer, agent and driver assessments, review persistence, unavailable provider, mobile layout and logout privacy passed.');
 }finally{if(browser)await browser.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
