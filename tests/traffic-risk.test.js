'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {routeGroup,assessTraffic,createTrafficMonitor}=require('../server/traffic-risk');

test('routes are classified without treating payment callbacks as browsers',()=>{
  assert.equal(routeGroup('POST','/api/auth/login'),'authentication');
  assert.equal(routeGroup('POST','/api/auth/phone/challenges'),'authentication');
  assert.equal(routeGroup('GET','/api/listings'),'discovery');
  assert.equal(routeGroup('POST','/api/search'),'discovery');
  assert.equal(routeGroup('POST','/api/viewing-requests'),'booking');
  assert.equal(routeGroup('POST','/api/provider-callbacks/mpesa'),'provider_callback');
  assert.equal(routeGroup('POST','/api/operations/payment-events'),'provider_callback');
  assert.equal(routeGroup('GET','/api/health/live'),'other');
});

test('risk scoring requires trusted external evidence; unknown means unassessed',()=>{
  assert.deepEqual(assessTraffic(),{score:0,classification:'UNASSESSED',action:'OBSERVE_ONLY',signals:[]});
  assert.deepEqual(assessTraffic({networkReputation:'high',botVerdict:'bot'}),{score:80,classification:'HIGH',action:'OBSERVE_ONLY',signals:['NETWORK_REPUTATION','BOT_VERDICT']});
  assert.equal(assessTraffic({networkReputation:'high',botVerdict:'bot',velocityAnomaly:true,authenticationFailureBurst:true}).score,100);
  assert.throws(()=>assessTraffic({networkReputation:'blocked'}),/Invalid network/);
});

test('observer emits a single sanitized warning without blocking or trusting request headers',()=>{
  let now=1000;const events=[];
  const observe=createTrafficMonitor({clock:()=>now,emit:e=>events.push(e),thresholds:{authentication:2},windowMs:5000});
  const req={remoteAddress:'192.0.2.13',method:'POST',path:'/api/auth/login',requestId:'id-123',headers:{'x-forwarded-for':'10.0.0.1'}};
  assert.equal(observe(req).classification,'UNASSESSED');
  assert.equal(observe(req).score,0);
  assert.equal(observe(req).score,20);
  assert.equal(observe(req).score,20);
  assert.equal(events.length,1);
  assert.equal(events[0].action,'OBSERVE_ONLY');
  assert.equal(events[0].source,'socket_peer');
  assert.equal(JSON.stringify(events).includes('192.0.2.13'),false);
  assert.equal(JSON.stringify(events).includes('10.0.0.1'),false);
  assert.equal(observe({...req,path:'/api/provider-callbacks/mpesa'}),null);
  now+=5001;
  assert.equal(observe(req).score,0);
});

test('telemetry failure and full bounded cache never interrupt traffic',()=>{
  const observe=createTrafficMonitor({emit:()=>{throw Error('sink unavailable');},thresholds:{authentication:1},maxKeys:1});
  const r={method:'POST',path:'/api/auth/login',requestId:'i'};
  assert.equal(observe({...r,remoteAddress:'198.51.100.1'}).score,0);
  assert.equal(observe({...r,remoteAddress:'198.51.100.1'}).score,20);
  assert.equal(observe({...r,remoteAddress:'198.51.100.2'}),null);
});
