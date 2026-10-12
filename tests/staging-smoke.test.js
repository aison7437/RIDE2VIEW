const test=require('node:test'),assert=require('node:assert/strict');
const {probe}=require('../scripts/staging-smoke');
test('staging probes enforce TLS and fail closed on failed health or anonymous admin access',async()=>{
 await assert.rejects(probe('http://example.test'),/HTTPS/);
 await assert.rejects(probe('https://example.test',async()=>new Response('{}',{status:503})),/503/);
 await assert.rejects(probe('https://example.test',async()=>new Response('{}')),/401/);
 const paths=[];const result=await probe('https://example.test',async(url,options)=>{paths.push(new URL(url).pathname);assert.equal(options.redirect,'error');return new Response('{}',{status:url.endsWith('/audit')?401:200});});
 assert.equal(result.status,'passed');assert.equal(paths.length,3);
});
