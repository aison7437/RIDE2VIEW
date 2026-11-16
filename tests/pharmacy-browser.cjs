'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createApp}=require('../server/app');
(async()=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false,startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false});
 let browser;
 try{
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.R2V_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900}});
   const page=await context.newPage();
   const errors=[];const pharmacyRequests=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(request.url().includes('/api/pharmacy'))pharmacyRequests.push(request.url());});
   await page.goto(base+'/pharmacy');
   await assert.equal(await page.title(),'Ride2View Pharmacy — Design Preview');
   await assert.equal(await page.getByRole('heading',{name:/Good health/}).count(),1);
   await assert.equal(await page.locator('.category').count(),5);
   await assert.equal(await page.locator('.product').count(),5);
   await page.getByRole('button',{name:'Skin & sun'}).click();
   await assert.equal(await page.locator('.product').count(),1);
   await assert.equal(await page.locator('.category[aria-pressed="true"]').count(),1);
   await assert.equal(await page.locator('.category[aria-pressed="true"]').evaluate(node=>node===document.activeElement),true);
   await page.getByRole('button',{name:'Skin & sun'}).click();
   await page.getByRole('searchbox',{name:'Search wellness categories'}).fill('first aid');
   await assert.equal(await page.locator('.product').count(),1);
   await page.getByRole('searchbox',{name:'Search wellness categories'}).fill('no-match-collection');
   await assert.equal(await page.locator('#empty-state').isVisible(),true);
   await assert.equal(await page.locator('#result-count').textContent(),'0 illustrative collections shown');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
   assert.equal(overflow,false,'Horizontal overflow at '+width+'px');
   assert.deepEqual(errors,[]);
   assert.deepEqual(pharmacyRequests,[]);
   await context.close();
  }
  console.log('Pharmacy browser preview passed at 390, 768 and 1440px');
 }finally{
  if(browser)await browser.close();
  if(app.server.listening)await new Promise((resolve,reject)=>app.server.close(error=>error?reject(error):resolve()));
  app.db.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
