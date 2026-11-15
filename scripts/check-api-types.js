'use strict';

/**
 * API-02: source-backed typed core coverage check.
 * The existing API-01 inventory remains authoritative for route ownership.
 * Payload schemas remain descriptive; this is NOT runtime request interception.
 */
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const root=join(__dirname,'..');
const read=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const refName=x=>{
  const match=x?.$ref?.match(/^#\/components\/schemas\/([^/]+)$/);
  return match?.[1]||null;
};
function validateTypedCoverage(){
  const spec=read('docs/api/openapi.json');
  const coverage=read('docs/api/typed-coverage.json');
  assert.match(spec.openapi,/^3\.1\.\d+$/);
  assert.equal(coverage.formatVersion,1);
  assert.ok(Array.isArray(coverage.operations)&&coverage.operations.length>=20);
  const seen=new Set();
  for(const entry of coverage.operations){
    const {method,path,requestSchema,responseSchema,successStatus,source}=entry;
    const key=method+' '+path;
    assert.ok(!seen.has(key),'Duplicate API-02 typed entry: '+key);
    seen.add(key);
    const operation=spec.paths[path]?.[method.toLowerCase()];
    assert.ok(operation,'Missing API operation: '+key);
    assert.equal(operation['x-r2v-contract-level'],'typed-core-v2',key);
    assert.ok(operation['x-r2v-route-sources']?.some(s=>s.file===source),'Missing source provenance: '+key);
    if(requestSchema){
      const actual=refName(operation.requestBody?.content?.['application/json']?.schema);
      assert.equal(actual,requestSchema,'Request schema mismatch: '+key);
      assert.notEqual(actual,'OpaqueJsonObject');
    }
    if(responseSchema){
      const actual=refName(operation.responses[successStatus]?.content?.['application/json']?.schema);
      assert.equal(actual,responseSchema,'Response schema mismatch: '+key+' '+successStatus);
      assert.notEqual(actual,'OpaqueJsonObject');
    }
  }
  // Explicit contract invariants for replay, booking, callback and permissions.
  for(const path of ['/api/journeys','/api/viewing-requests']){
    assert.ok(spec.paths[path].post.responses['200'],'Idempotent replay must be documented: '+path);
    assert.ok(spec.paths[path].post.responses['201'],'Initial creation must be documented: '+path);
  }
  assert.ok(spec.paths['/api/bookings'].post.responses['409'],'Legacy booking creation remains forbidden');
  assert.deepEqual(spec.paths['/api/auth/email/challenges'].post.security,[],'Signup challenge remains unauthenticated');
  assert.ok(!('security' in spec.paths['/api/payments/{id}/verify'].post),'Payment admin endpoint uses existing session security default');
  assert.deepEqual(spec.security,[{cookieAuth:[]}]);
  assert.ok(spec.paths['/api/provider-callbacks/{provider}'].post.security?.some(s=>'providerSignature' in s));
  assert.ok(spec.paths['/api/operations/payment-events'].post.security?.some(s=>'gatewayHmac' in s));
  assert.equal(spec.components.schemas.ManualPaymentVerificationRequest.properties.amount.type,'integer','KES is verified in whole integer units');
  assert.equal(spec.components.schemas.PropertyListingSnapshot.required.includes('verification'),false,'Snapshots must not promise live verification');
  assert.equal(spec.components.schemas.PropertyListing.required.includes('verification'),true,'Public projections require verification flags');
  console.log('API-02 typed contract OK: '+coverage.operations.length+' selected method/path operations with source-linked schemas.');
  return coverage.operations.length;
}
if(require.main===module){
  try{validateTypedCoverage();}catch(error){console.error('API-02 typed contract failed: '+error.message);process.exitCode=1;}
}
module.exports={validateTypedCoverage};
