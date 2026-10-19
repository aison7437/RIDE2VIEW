const test=require('node:test');
const assert=require('node:assert/strict');
const {createProviderCallbackRuntime}=require('../server/payments/provider-callback-runtime');

test('callback runtime starts once, drains with stable worker identity, and stops cleanly',()=>{
 const calls=[],timers=[],cleared=[];
 const boundary={processDue:args=>{calls.push(args);return [{id:'processed'}];}};
 const runtime=createProviderCallbackRuntime({
  boundary,workerId:'worker-v11',batchSize:3,
  setIntervalFn:(fn,ms)=>{const handle={fn,ms,unref(){this.unrefed=true;}};timers.push(handle);return handle;},
  clearIntervalFn:handle=>cleared.push(handle)
 });
 assert.deepEqual(runtime.drain(),[]);
 runtime.start();
 assert.equal(runtime.started,true);
 assert.equal(runtime.workerId,'worker-v11');
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0],{workerId:'worker-v11',limit:3});
 assert.equal(timers.length,1);
 assert.equal(timers[0].ms,5000);
 assert.equal(timers[0].unrefed,true);
 runtime.start();
 assert.equal(timers.length,1);
 assert.equal(calls.length,1);
 assert.deepEqual(runtime.drain(),[{id:'processed'}]);
 timers[0].fn();
 assert.equal(calls.length,3);
 runtime.stop();
 assert.equal(runtime.started,false);
 assert.equal(cleared.length,1);
 assert.deepEqual(runtime.drain(),[]);
 runtime.stop();
 assert.equal(cleared.length,1);
});

test('callback runtime releases running guard after a failed drain so recovery can retry',()=>{
 let attempts=0;
 const boundary={processDue:()=>{attempts++;if(attempts===2)throw new Error('transient callback failure');return ['recovered'];}};
 let tick;
 const runtime=createProviderCallbackRuntime({
  boundary,workerId:'recovery-worker',
  setIntervalFn:fn=>{tick=fn;return {unref(){}};},
  clearIntervalFn:()=>{}
 });
 runtime.start();
 assert.equal(attempts,1);
 assert.throws(()=>tick(),/transient callback failure/);
 assert.equal(runtime.running,false);
 assert.deepEqual(runtime.drain(),['recovered']);
 assert.equal(attempts,3);
 runtime.stop();
});

test('callback runtime blocks overlapping drains from the same worker',()=>{
 let runtime,nested;
 const boundary={processDue:()=>{nested=runtime.drain();return ['outer'];}};
 runtime=createProviderCallbackRuntime({boundary,setIntervalFn:()=>({unref(){}}),clearIntervalFn:()=>{}});
 runtime.start();
 assert.deepEqual(nested,[]);
 assert.deepEqual(runtime.drain(),['outer']);
 runtime.stop();
});
