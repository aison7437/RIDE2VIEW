// Read-only gate for the public customer origin: detect static-only deployments and broken /api routing.
'use strict';
function origin(value) {
 if (!value) throw new Error('FRONTEND_URL is required');
 let url;
 try { url = new URL(value); } catch { throw new Error('FRONTEND_URL must be an HTTPS origin'); }
 if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
  throw new Error('FRONTEND_URL must be an HTTPS origin without a path, query, or credentials');
 }
 return url.origin;
}
async function probe(frontendUrl, fetchFn = fetch) {
 const base = origin(frontendUrl);
 const paths = ['/', '/api/health/live', '/api/health/ready', '/api/admin/audit'];
 const results = {};
 for (const path of paths) {
  const response = await fetchFn(base + path, { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { accept: path === '/' ? 'text/html' : 'application/json' } });
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (path === '/') {
   if (!response.ok || !contentType.includes('text/html')) throw new Error('Customer frontend must return HTML with HTTP 2xx');
  } else if (path === '/api/admin/audit') {
   if (response.status !== 401) throw new Error('Anonymous administrator endpoint must return HTTP 401 (got ' + response.status + ')');
  } else {
   if (!response.ok) throw new Error(path + ' returned HTTP ' + response.status);
   if (!contentType.includes('application/json')) throw new Error(path + ' did not return JSON; check /api reverse proxy (possible SPA fallback)');
   try { await response.json(); } catch { throw new Error(path + ' returned invalid JSON'); }
  }
  results[path] = response.status;
 }
 return { status: 'passed', origin: base, results, scope: 'public frontend, same-origin API routing, backend health, anonymous admin denial' };
}
if (require.main === module) probe(process.env.FRONTEND_URL).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { origin, probe };
