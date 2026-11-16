'use strict';

// Shared contract for premium proxy -> Ride2View backend origin proof.
// This only attests to possession of a server-side key. It is NOT an IP
// identity, browser bot verdict, replay-proof authorization, or access token.
const {createHash,createHmac,randomBytes,timingSafeEqual}=require('node:crypto');

const HEADERS=Object.freeze({
  timestamp:'x-r2v-proxy-timestamp',
  nonce:'x-r2v-proxy-nonce',
  signature:'x-r2v-proxy-signature'
});
const MAX_AGE_MS=120000;
function validSecret(secret) {
  return typeof secret==='string' && Buffer.byteLength(secret,'utf8')>=32;
}
function validPath(method,path) {
  return (method==='GET'||method==='POST') && typeof path==='string' &&
    (path==='/api/config' || /^\/api\/auth\/[a-z0-9/-]+$/.test(path));
}
function canonical({timestamp,nonce,method,path,body}) {
  const hash=createHash('sha256').update(body,'utf8').digest('hex');
  return ['r2v-proxy-v1',timestamp,nonce,method,path,hash].join('\n');
}
function signProxyAttestation({secret,method,path,body='',now=Date.now(),nonce=randomBytes(16).toString('hex')}={}) {
  if (!validSecret(secret)||!validPath(method,path)||typeof body!=='string'||
      !Number.isSafeInteger(now)||now<0||!(/^[a-f0-9]{32}$/.test(nonce))) {
    throw new TypeError('Invalid proxy attestation signing parameters');
  }
  const timestamp=String(now);
  const signature=createHmac('sha256',secret).update(canonical({timestamp,nonce,method,path,body})).digest('hex');
  return Object.freeze({
    [HEADERS.timestamp]:timestamp,
    [HEADERS.nonce]:nonce,
    [HEADERS.signature]:signature
  });
}
function readOne(headers,key) {
  const value=headers?.[key];
  return typeof value==='string' ? value : null; // reject arrays and duplicates
}
function verifyProxyAttestation({secret,headers={},method,path,body='',now=Date.now(),maxAgeMs=MAX_AGE_MS}={}) {
  const present=Object.values(HEADERS).some(key=>headers[key]!=null);
  if (!present) return Object.freeze({status:'ABSENT',verified:false});
  if (!validSecret(secret)||!validPath(method,path)||typeof body!=='string'||
      !Number.isSafeInteger(now)||!Number.isSafeInteger(maxAgeMs)||
      maxAgeMs<1000||maxAgeMs>300000) {
    return Object.freeze({status:'INVALID',verified:false});
  }
  const timestamp=readOne(headers,HEADERS.timestamp);
  const nonce=readOne(headers,HEADERS.nonce);
  const signature=readOne(headers,HEADERS.signature);
  if (!timestamp||!/^\d{13}$/.test(timestamp) ||
      !nonce||!/^[a-f0-9]{32}$/.test(nonce) ||
      !signature||!/^[a-f0-9]{64}$/.test(signature)) {
    return Object.freeze({status:'INVALID',verified:false});
  }
  const created=Number(timestamp);
  if (!Number.isSafeInteger(created)||Math.abs(now-created)>maxAgeMs) {
    return Object.freeze({status:'EXPIRED',verified:false});
  }
  const expected=createHmac('sha256',secret)
    .update(canonical({timestamp,nonce,method,path,body})).digest();
  const received=Buffer.from(signature,'hex');
  return timingSafeEqual(expected,received)
    ? Object.freeze({status:'VERIFIED',verified:true})
    : Object.freeze({status:'INVALID',verified:false});
}

module.exports={HEADERS,MAX_AGE_MS,signProxyAttestation,verifyProxyAttestation};
