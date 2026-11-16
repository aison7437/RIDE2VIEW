'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const { DatabaseSync }=require('node:sqlite');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {createAtomicAuthQuotaObserver}=require('../server/atomic-auth-quota');

const secret='sec04-test-only-secret-is-longer-than-32-bytes';

test('atomic auth quota shares counters between SQLite connections, without raw PII',()=>{
  const dir=mkdtempSync(join(tmpdir(),'r2v-sec04-'));
  const file=join(dir,'security.sqlite');
  let first,second,third;
  let now=60000;
  const received=[];
  try {
    first=new DatabaseSync(file);
    second=new DatabaseSync(file);
    first.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    second.exec('PRAGMA busy_timeout=5000;');
    const a=createAtomicAuthQuotaObserver({db:first,secret,clock:()=>now,emit:event=>received.push(event)});
    const b=createAtomicAuthQuotaObserver({db:second,secret,clock:()=>now,emit:event=>received.push(event)});
    const req={scope:'phone_challenge',subject:'+254700000001',limit:2,windowMs:60000};
    assert.equal(a.observe(req).count,1);
    assert.equal(b.observe(req).count,2);
    assert.deepEqual(a.observe(req),{count:3,exceeded:true,action:'OBSERVE_ONLY',state:'OBSERVED'});
    assert.equal(b.observe(req).count,4);
    assert.equal(received.length,1);
    assert.equal(received[0].scope,'phone_challenge');
    assert.equal(received[0].action,'OBSERVE_ONLY');
    const records=first.prepare('SELECT * FROM security_auth_quota_windows').all();
    assert.equal(records.length,1);
    assert.match(records[0].key_digest,/^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(records).includes('+254700000001'),false);
    assert.equal(JSON.stringify(received).includes('+254700000001'),false);
    assert.equal(b.observe({...req,subject:'+254700000002'}).count,1);
    assert.equal(b.observe({...req,scope:'email_challenge',subject:'someone@example.test'}).count,1);
    third=new DatabaseSync(file);
    assert.equal(createAtomicAuthQuotaObserver({db:third,secret,clock:()=>now}).observe(req).count,5);
    now+=60000;
    assert.equal(a.observe(req).count,1);
    assert.equal(a.pruneExpired(),3);
  } finally {
    third?.close();second?.close();first?.close();
    rmSync(dir,{force:true,recursive:true});
  }
});

test('observer is always non-enforcing and telemetry outages do not change quota decision',()=>{
  const db=new DatabaseSync(':memory:');
  try {
    const a=createAtomicAuthQuotaObserver({db,secret,emit:()=>{throw Error('telemetry down');}});
    for(let n=1;n<=5;n++){
      const result=a.observe({scope:'email_challenge',subject:'test@example.test',limit:1});
      assert.equal(result.count,n);
      assert.equal(result.action,'OBSERVE_ONLY');
      assert.equal(result.exceeded,n>1);
    }
  } finally {db.close();}
});

test('refuse unbounded or unsafe inputs instead of persisting identifiers',()=>{
  const db=new DatabaseSync(':memory:');
  try {
    assert.throws(()=>createAtomicAuthQuotaObserver({db,secret:'short'}),/Invalid atomic/);
    const observer=createAtomicAuthQuotaObserver({db,secret});
    assert.throws(()=>observer.observe({scope:'arbitrary',subject:'test'}),/Invalid atomic/);
    assert.throws(()=>observer.observe({scope:'phone_challenge',subject:''}),/Invalid atomic/);
    assert.throws(()=>observer.observe({scope:'phone_challenge',subject:'x'.repeat(321)}),/Invalid atomic/);
    assert.throws(()=>observer.observe({scope:'phone_challenge',subject:'x',windowMs:0}),/Invalid atomic/);
  }finally {db.close();}
});
