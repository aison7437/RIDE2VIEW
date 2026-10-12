// Read-only remote deployment probes; no financial actions or fixture creation.
'use strict';
async function probe(base,fetchFn=fetch){
 const url=new URL(base);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('STAGING_URL must be an HTTPS origin');
 for(const path of ['/api/health/live','/api/health/ready']){
  const r=await fetchFn(url.origin+path,{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error(path+' returned '+r.status);
  await r.json();
 }
 const denied=await fetchFn(url.origin+'/api/admin/audit',{redirect:'error',signal:AbortSignal.timeout(10000)});
 if(denied.status!==401)throw new Error('Anonymous administrator access did not return 401');
 return {status:'passed',scope:'HTTPS, liveness, readiness, anonymous administrator denial'};
}
if(require.main===module)probe(process.env.STAGING_URL).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={probe};
