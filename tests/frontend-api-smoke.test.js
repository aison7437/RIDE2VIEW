'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { origin, probe } = require('../scripts/frontend-api-smoke');
const json = (status = 200) => new Response('{}', { status, headers: { 'content-type': 'application/json' } });
const html = () => new Response('<!doctype html><title>Ride2View</title>', { headers: { 'content-type': 'text/html' } });
test('rejects missing or unsafe frontend origins', async () => {
 for (const url of [undefined, 'http://example.test', 'https://user:pass@example.test/', 'https://example.test/app', 'https://example.test/?token=1']) {
  await assert.rejects(probe(url), /FRONTEND_URL/);
 }
 assert.equal(origin('https://example.test/'), 'https://example.test');
});
test('passes a customer origin with real same-origin JSON API and protected admin endpoint', async () => {
 const visited = [];
 const result = await probe('https://example.test/', async (url, options) => {
  const path = new URL(url).pathname;
  visited.push(path);
  assert.equal(options.redirect, 'error');
  return path === '/' ? html() : path === '/api/admin/audit' ? json(401) : json();
 });
 assert.equal(result.status, 'passed');
 assert.deepEqual(visited, ['/', '/api/health/live', '/api/health/ready', '/api/admin/audit']);
});
test('rejects static SPA fallback on API paths', async () => {
 await assert.rejects(probe('https://example.test/', async url => html()), /reverse proxy/);
});
test('rejects unavailable backend and anonymous admin access', async () => {
 await assert.rejects(probe('https://example.test/', async url => new URL(url).pathname === '/' ? html() : json(503)), /503/);
 await assert.rejects(probe('https://example.test/', async url => new URL(url).pathname === '/' ? html() : json()), /401/);
});
test('rejects malformed JSON even with successful HTTP status', async () => {
 await assert.rejects(probe('https://example.test/', async url => new URL(url).pathname === '/' ? html() : new Response('bad', { headers: { 'content-type': 'application/json' } })), /invalid JSON/);
});
