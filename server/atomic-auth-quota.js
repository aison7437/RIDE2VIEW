'use strict';

// SEC-04: atomic, per-destination quota observations on a shared SQLite file.
// No enforcement or cross-host distribution is implied.
const {createHmac} = require('node:crypto');
const VALID_SCOPES = new Set(['phone_challenge','email_challenge']);

function createAtomicAuthQuotaObserver({db,secret,clock=Date.now,emit=()=>{},cleanupInterval=128}={}) {
  if (!db || typeof db.prepare!=='function' ||
      typeof secret!=='string' || Buffer.byteLength(secret)<32 ||
      typeof clock!=='function' || typeof emit!=='function' ||
      !Number.isSafeInteger(cleanupInterval) || cleanupInterval<1) {
    throw new TypeError('Invalid atomic auth quota observer configuration');
  }
  // Table creation happens only after an explicit feature opt-in.
  db.exec('CREATE TABLE IF NOT EXISTS security_auth_quota_windows(' +
    'key_digest TEXT PRIMARY KEY,scope TEXT NOT NULL,' +
    'hits INTEGER NOT NULL CHECK(hits>=1),expires_at INTEGER NOT NULL);' +
    'CREATE INDEX IF NOT EXISTS security_auth_quota_expiry ' +
    'ON security_auth_quota_windows(expires_at);');
  const increment = db.prepare(
    'INSERT INTO security_auth_quota_windows (key_digest,scope,hits,expires_at) ' +
    'VALUES(?,?,1,?) ON CONFLICT(key_digest) ' +
    'DO UPDATE SET hits=security_auth_quota_windows.hits+1 RETURNING hits');
  const clean = db.prepare('DELETE FROM security_auth_quota_windows WHERE expires_at<=?');
  let calls=0;
  return Object.freeze({
    observe({scope,subject,limit=3,windowMs=3600000}={}) {
      if (!VALID_SCOPES.has(scope) || typeof subject!=='string' ||
          subject.length===0 || subject.length>320 ||
          !Number.isSafeInteger(limit) || limit<1 ||
          !Number.isSafeInteger(windowMs) || windowMs<1000) {
        throw new TypeError('Invalid atomic auth quota observation');
      }
      const now=clock();
      if (!Number.isSafeInteger(now) || now<0) throw new TypeError('Invalid quota clock');
      const start=Math.floor(now/windowMs)*windowMs;
      const expiresAt=start+windowMs;
      // Opaque per-window HMAC: never persist or log raw contact identifiers.
      const keyDigest=createHmac('sha256',secret)
        .update('ride2view:sec04:v1\0').update(scope).update('\0')
        .update(String(windowMs)).update('\0').update(String(start))
        .update('\0').update(subject).digest('hex');
      try {
        if (++calls%cleanupInterval===0) clean.run(now);
        // Atomic across SQLite connections sharing one coherently locked DB file.
        const {hits}=increment.get(keyDigest,scope,expiresAt);
        if (hits===limit+1) {
          const event=Object.freeze({
            event:'auth_quota_shadow_exceeded',scope,limit,windowMs,count:hits,
            action:'OBSERVE_ONLY',identity:'HMAC_DESTINATION'
          });
          try {emit(event);} catch { /* telemetry never interrupts authentication */ }
        }
        return Object.freeze({count:hits,exceeded:hits>limit,action:'OBSERVE_ONLY',state:'OBSERVED'});
      } catch {
        // Missing telemetry must never deny an otherwise valid request.
        return Object.freeze({count:null,exceeded:null,action:'OBSERVE_ONLY',state:'UNAVAILABLE'});
      }
    },
    pruneExpired() {
      try {return clean.run(clock()).changes;} catch {return 0;}
    }
  });
}

module.exports={createAtomicAuthQuotaObserver};
