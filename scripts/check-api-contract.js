'use strict';

/**
 * API-01: zero-dependency OpenAPI 3.1 contract and source-drift guard.
 *
 * The handler inventory is intentionally explicit. Route strings are extracted
 * from the actual HTTP dispatch modules, then checked against the reviewed
 * normalized route-to-method inventory and its OpenAPI operations.
 *
 * This does not validate arbitrary request/response bodies at runtime:
 * business authorities remain responsible for their existing validation.
 */
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const root = join(__dirname, '..');
const readJson = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const canonical = value => value.replace(/\s+/g, '');
const routeExpression = /path\s*===?\s*(['"])(\/api\/[^'"]+)\1|path\.match\((\/\^.*?\$\/[igmuy]*)\)/gs;
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

function discoverMarkers(file) {
  const source = readFileSync(join(root, file), 'utf8');
  return [...new Set([...source.matchAll(routeExpression)].map(match => canonical(match[0])))];
}

function validateContract() {
  const manifest = readJson('docs/api/route-inventory.json');
  const spec = readJson('docs/api/openapi.json');
  assert.match(spec.openapi, /^3\.1\.\d+$/, 'Use OpenAPI 3.1');
  assert.ok(spec.info?.title && spec.info?.version);
  assert.ok(spec.paths && typeof spec.paths === 'object');
  assert.ok(spec.components?.schemas && spec.components?.responses);
  assert.equal(manifest.formatVersion, 1);
  assert.ok(Array.isArray(manifest.sourceFiles) && manifest.sourceFiles.length);
  assert.ok(Array.isArray(manifest.routeMarkers) && manifest.routeMarkers.length);

  const keyOf = (file, marker) => file + '::' + canonical(marker);
  const actual = new Set();
  for (const file of manifest.sourceFiles) {
    for (const marker of discoverMarkers(file)) actual.add(keyOf(file, marker));
  }
  const excluded = new Set();
  for (const item of manifest.excluded || []) {
    assert.ok(item.reason, 'Excluded source marker needs a rationale');
    excluded.add(keyOf(item.file, item.marker));
  }
  const recorded = new Set();
  const backedOperations = new Map();
  for (const entry of manifest.routeMarkers) {
    assert.ok(manifest.sourceFiles.includes(entry.file), 'Unknown source file: ' + entry.file);
    const sourceKey = keyOf(entry.file, entry.marker);
    assert.ok(!recorded.has(sourceKey), 'Duplicate route marker: ' + sourceKey);
    recorded.add(sourceKey);
    assert.ok(Array.isArray(entry.operations) && entry.operations.length, 'Marker has no operations: ' + sourceKey);
    for (const item of entry.operations) {
      assert.match(item.path, /^\/api\//);
      assert.ok(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)$/.test(item.method));
      const opKey = item.method.toLowerCase() + ' ' + item.path;
      if (!backedOperations.has(opKey)) backedOperations.set(opKey, new Set());
      backedOperations.get(opKey).add(sourceKey);
    }
  }
  for (const marker of actual) {
    assert.ok(recorded.has(marker) || excluded.has(marker), 'Undocumented new/changed source route marker: ' + marker);
  }
  for (const marker of recorded) {
    assert.ok(actual.has(marker), 'Route removed or changed without revising inventory: ' + marker);
    assert.ok(!excluded.has(marker), 'Excluded source marker also appears as a route: ' + marker);
  }
  for (const marker of excluded) assert.ok(actual.has(marker), 'Stale excluded route marker: ' + marker);

  const seenIds = new Set();
  let count = 0;
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    assert.match(path, /^\/api\//);
    const pathParams = [...path.matchAll(/\{([^}]+)\}/g)].map(match => match[1]);
    const declared = (pathItem.parameters || []).filter(p => p.in === 'path');
    assert.deepEqual(new Set(declared.map(p => p.name)), new Set(pathParams), 'Path parameter declarations: ' + path);
    for (const p of declared) assert.equal(p.required, true, 'Path parameters must be required: ' + path);
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!methods.has(method)) {
        assert.ok(['parameters', 'summary', 'description', 'servers'].includes(method) || method.startsWith('x-'), 'Unknown path property: ' + path + ' ' + method);
        continue;
      }
      count++;
      const opKey = method + ' ' + path;
      assert.ok(backedOperations.has(opKey), 'Documented operation absent from source inventory: ' + opKey);
      assert.ok(operation.operationId && !seenIds.has(operation.operationId), 'Missing/duplicate operationId: ' + opKey);
      seenIds.add(operation.operationId);
      assert.ok(operation.responses && Object.keys(operation.responses).length, 'Missing responses: ' + opKey);
      assert.ok(Array.isArray(operation.tags) && operation.tags.length, 'Missing tags: ' + opKey);
      assert.ok(Array.isArray(operation['x-r2v-route-sources']), 'Missing source evidence: ' + opKey);
      const sources = new Set(operation['x-r2v-route-sources'].map(src => keyOf(src.file, src.marker)));
      assert.deepEqual(sources, backedOperations.get(opKey), 'Incorrect source evidence: ' + opKey);
      if (['post', 'put', 'patch'].includes(method) && opKey !== 'post /api/bookings') {
        assert.ok(operation.requestBody?.content?.['application/json'], 'Missing JSON request body: ' + opKey);
      }
    }
  }
  assert.equal(count, backedOperations.size, 'OpenAPI and source operation totals must match');
  for (const opKey of backedOperations.keys()) {
    const [method, path] = opKey.split(' ', 2);
    assert.ok(spec.paths[path]?.[method], 'Missing OpenAPI operation: ' + opKey);
  }
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (value.$ref) {
      const match = value.$ref.match(/^#\/components\/(schemas|responses|securitySchemes)\/([^/]+)$/);
      assert.ok(match, 'Unsupported or malformed reference: ' + value.$ref);
      assert.ok(spec.components[match[1]]?.[match[2]], 'Dangling reference: ' + value.$ref);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(spec);
  assert.ok(spec.components.securitySchemes.cookieAuth);
  assert.deepEqual(spec.paths['/api/health/live'].get.security, [], 'Liveness must remain public');
  assert.ok(spec.paths['/api/provider-callbacks/{provider}'].post.security?.some(s => 'providerSignature' in s));
  assert.ok(spec.paths['/api/operations/payment-events'].post.security?.some(s => 'gatewayHmac' in s));
  assert.ok(spec.paths['/api/bookings'].post.responses['409'], 'Legacy direct booking guard must be documented');
  console.log('API-01 contract OK: ' + manifest.routeMarkers.length + ' route declarations, ' +
    Object.keys(spec.paths).length + ' paths, ' + count + ' HTTP operations across ' +
    manifest.sourceFiles.length + ' handler files.');
  return {routes:manifest.routeMarkers.length, paths:Object.keys(spec.paths).length, operations:count};
}

if (require.main === module) {
  try {validateContract();}
  catch (error) {console.error('API-01 contract failed:', error.message);process.exitCode = 1;}
}
module.exports = {validateContract, discoverMarkers};
