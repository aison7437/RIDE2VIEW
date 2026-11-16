'use strict';

// SEC-01: a non-enforcing application traffic observer. Network reputation and
// bot verdicts must come from verified, server-side integrations (not HTTP headers).
const {isIP} = require('node:net');

const DEFAULT_THRESHOLDS = Object.freeze({authentication:25, discovery:90, booking:45});
const SIGNAL_WEIGHTS = Object.freeze({
  network: Object.freeze({unknown:0, low:0, medium:15, high:30}),
  bot: Object.freeze({unknown:0, human:0, suspicious:25, bot:50})
});

function routeGroup(method, path) {
  if (typeof path !== 'string' || typeof method !== 'string') return 'other';
  if (/^\/api\/(provider-callbacks\/|operations\/payment-events(?:\/|$))/.test(path)) return 'provider_callback';
  if (path.startsWith('/api/auth/')) return 'authentication';
  if ((method === 'POST' && path === '/api/search') || (method === 'GET' && path === '/api/listings')) return 'discovery';
  if (/^\/api\/(viewing-requests|bookings|journeys|ride2go)(?:\/|$)/.test(path)) return 'booking';
  return 'other';
}

function assessTraffic({networkReputation='unknown', botVerdict='unknown', velocityAnomaly=false, authenticationFailureBurst=false}={}) {
  if (!Object.hasOwn(SIGNAL_WEIGHTS.network,networkReputation)) throw new TypeError('Invalid network reputation evidence');
  if (!Object.hasOwn(SIGNAL_WEIGHTS.bot,botVerdict)) throw new TypeError('Invalid bot verdict evidence');
  const signals=[];
  let score=0;
  if (SIGNAL_WEIGHTS.network[networkReputation]) {score+=SIGNAL_WEIGHTS.network[networkReputation];signals.push('NETWORK_REPUTATION');}
  if (SIGNAL_WEIGHTS.bot[botVerdict]) {score+=SIGNAL_WEIGHTS.bot[botVerdict];signals.push('BOT_VERDICT');}
  if (velocityAnomaly) {score+=20;signals.push('SOCKET_VELOCITY');}
  if (authenticationFailureBurst) {score+=20;signals.push('AUTH_FAILURE_BURST');}
  score=Math.min(100,score);
  // Unknown evidence does not mean a trusted human or a malicious bot.
  return Object.freeze({score,classification:score>=70?'HIGH':score>=35?'ELEVATED':score>0?'OBSERVE':'UNASSESSED',action:'OBSERVE_ONLY',signals:Object.freeze(signals)});
}

function createTrafficMonitor({clock=Date.now,emit=()=>{},windowMs=60000,maxKeys=10000,thresholds=DEFAULT_THRESHOLDS}={}) {
  if (typeof clock!=='function'||typeof emit!=='function'||!Number.isSafeInteger(windowMs)||windowMs<1000||!Number.isSafeInteger(maxKeys)||maxKeys<1) throw new TypeError('Invalid traffic observer configuration');
  const limits={...DEFAULT_THRESHOLDS,...thresholds};
  for (const key of Object.keys(DEFAULT_THRESHOLDS)) if (!Number.isSafeInteger(limits[key])||limits[key]<1) throw new TypeError('Invalid traffic threshold');
  const buckets=new Map();
  return function observe({remoteAddress,method,path,requestId,signals={}}={}) {
    const group=routeGroup(method,path);
    // Provider callbacks require verified signatures/idempotency, not browser challenges.
    if (!Object.hasOwn(limits,group)) return null;
    // Socket address is NOT the browser IP when a reverse proxy is in use.
    // Ignore x-forwarded-for and all other client-supplied identity headers.
    const peer=typeof remoteAddress==='string' && isIP(remoteAddress.replace(/^::ffff:/,'')) ? remoteAddress : 'unidentified_socket';
    const key=group+'|'+peer;
    const now=clock();
    let current=buckets.get(key);
    if (!current || current.expires<=now) {
      if (buckets.size>=maxKeys) {
        for (const [k,v] of buckets) if (v.expires<=now) buckets.delete(k);
        if (buckets.size>=maxKeys) return null; // fail open; never block users
      }
      current={count:0,expires:now+windowMs,reported:false};buckets.set(key,current);
    }
    current.count++;
    const verdict=assessTraffic({...signals,velocityAnomaly:current.count>limits[group]});
    if (verdict.score && !current.reported) {
      current.reported=true;
      // No IP address, cookies, tokens, identity, request body or raw URL in events.
      const event=Object.freeze({event:'traffic_risk_observed',requestId,routeGroup:group,source:'socket_peer',count:current.count,score:verdict.score,classification:verdict.classification,action:verdict.action,signals:verdict.signals});
      try {emit(event);} catch { /* telemetry cannot interrupt a customer request */ }
    }
    return verdict;
  };
}

module.exports={routeGroup,assessTraffic,createTrafficMonitor,DEFAULT_THRESHOLDS};
