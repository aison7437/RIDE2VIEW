'use strict';
const { randomUUID } = require('node:crypto');
function productionConfig(env=process.env) {
  if(env.NODE_ENV!=='production') return true;
  if(env.COOKIE_SECURE!=='true') throw new Error('Production requires COOKIE_SECURE=true');
  if(!env.DB_PATH || env.DB_PATH===':memory:') throw new Error('Production requires a persistent DB_PATH');
  if(env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length<12) throw new Error('Production administrator password must be at least 12 characters');
  if(env.R2V_GATEWAY_URL && !/^https:\/\//i.test(env.R2V_GATEWAY_URL)) throw new Error('Production gateway must use HTTPS');
  if(env.R2V_GATEWAY_URL && !env.R2V_GATEWAY_TOKEN) throw new Error('Production gateway token is required');
  if(env.R2V_GATEWAY_URL && (!env.R2V_GATEWAY_CALLBACK_SECRET || env.R2V_GATEWAY_CALLBACK_SECRET.length<32)) throw new Error('Production gateway callback secret must contain at least 32 characters');
  return true;
}
function createRateLimiter({limit=120,windowMs=60000,maxKeys=10000,clock=Date.now}={}) {
  const buckets=new Map();
  return function check(key) {
    const now=clock(), previous=buckets.get(key);
    if(buckets.size>=maxKeys)for(const [k,v] of buckets)if(v.reset<=now)buckets.delete(k);
    if(!previous || previous.reset<=now) {
      if(buckets.size>=maxKeys) return {allowed:false,retryAfter:1};
      buckets.set(key,{count:1,reset:now+windowMs});return {allowed:true,retryAfter:0};
    }
    previous.count++;
    return {allowed:previous.count<=limit,retryAfter:Math.max(1,Math.ceil((previous.reset-now)/1000))};
  };
}
function logRequestError(error,{requestId=randomUUID(),method,path,status},logger=console) {
  const event={time:new Date().toISOString(),level:status>=500?'error':'warn',event:'http_request_failed',requestId,method,path,status,code:status>=500?'INTERNAL_ERROR':error.code||'REQUEST_REJECTED'};
  if(status>=500 && typeof logger.error==='function') logger.error(JSON.stringify(event));
  return event;
}
module.exports={productionConfig,createRateLimiter,logRequestError};
