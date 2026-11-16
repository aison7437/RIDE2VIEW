'use strict';
const {signProxyAttestation}=require('../lib/proxy-attestation');

const ALLOWED = new Set([
  'config', 'auth/login', 'auth/logout', 'auth/me', 'auth/register',
  'auth/email/challenges', 'auth/email/recovery/challenges', 'auth/phone/challenges',
  'auth/email/link/challenges', 'auth/phone/link/challenges', 'auth/challenges/verify'
]);

// The proxy rewrites Origin for the backend's same-origin check. Validate the
// *original* browser Origin first, otherwise the upstream never sees it.
function hasSafeBrowserOrigin(req, env = {}) {
  const headers = req.headers || {};
  const fetchSite = headers['sec-fetch-site'];
  if (fetchSite === 'cross-site') return false;
  const originalOrigin = headers.origin;
  // Preserve non-browser clients that have no Origin/Fetch Metadata headers.
  // A same-site browser request without Origin cannot prove exact origin.
  if (originalOrigin == null) return fetchSite !== 'same-site';
  if (typeof originalOrigin !== 'string' || originalOrigin.length > 1024) return false;
  const host = headers.host;
  if (typeof host !== 'string' || host.length > 255 || !host ||
      /[/@,\s]/.test(host)) return false;
  try {
    const origin = new URL(originalOrigin);
    const requestHost = new URL('https://' + host);
    const validScheme = origin.protocol === 'https:' ||
      (env.VERCEL !== '1' && origin.protocol === 'http:');
    return validScheme && !origin.username && !origin.password &&
      origin.pathname === '/' && !origin.search && !origin.hash &&
      origin.host === requestHost.host;
  } catch {
    return false;
  }
}

function createProxy({ env = process.env, fetchFn = fetch } = {}) {
  return async function proxy(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const pathParts = Array.isArray(req.query?.path) ? req.query.path : [req.query?.path].filter(Boolean);
    const path = pathParts.join('/');
    if (!ALLOWED.has(path)) { res.status(404).json({ error: 'Not found' }); return; }
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); res.status(405).json({ error: 'Method not allowed' }); return; }
    if (req.method === 'POST' && !hasSafeBrowserOrigin(req, env)) {
      res.status(403).json({ error: 'Cross-site request denied' }); return;
    }
    let upstream;
    try {
      upstream = new URL(env.R2V_API_ORIGIN || '');
      if (upstream.protocol !== 'https:' || upstream.username || upstream.password || upstream.pathname !== '/' || upstream.search || upstream.hash) throw new Error('INVALID_API_ORIGIN');
    } catch {
      res.status(503).json({ error: 'Authentication API is not connected' }); return;
    }
    const headers = { Accept: 'application/json', Origin: upstream.origin };
    if (req.headers?.cookie) headers.Cookie = req.headers.cookie;
    if (req.headers?.['content-type']) headers['Content-Type'] = req.headers['content-type'];
    const options = { method: req.method, headers, redirect: 'manual', signal: AbortSignal.timeout(15000) };
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      if (Buffer.byteLength(body) > 16000) { res.status(413).json({ error: 'Request is too large' }); return; }
      options.body = body;
    }
    if (env.R2V_PROXY_ATTESTATION_SIGN==='true') {
      try {
        const proof=signProxyAttestation({
          secret:env.R2V_PROXY_ATTESTATION_SECRET,
          method:req.method,path:'/api/'+path,
          body:options.body || ''
        });
        Object.assign(options.headers,proof);
      } catch {
        // An explicitly enabled signer must not silently send unsigned requests.
        res.status(503).json({error:'Authentication proxy security is not configured'});
        return;
      }
    }
    try {
      const response = await fetchFn(new URL(`/api/${path}`, upstream), options);
      const contentLength = Number(response.headers?.get('content-length') || 0);
      if (contentLength > 256000) { res.status(502).json({ error: 'Authentication service response was too large' }); return; }
      const cookies = typeof response.headers?.getSetCookie === 'function' ? response.headers.getSetCookie() : response.headers?.get('set-cookie');
      if (cookies?.length) res.setHeader('Set-Cookie', cookies);
      res.status(response.status);
      res.setHeader('Content-Type', response.headers?.get('content-type') || 'application/json; charset=utf-8');
      const payload = await response.text();
      if (payload.length > 256000) { res.status(502).json({ error: 'Authentication service response was too large' }); return; }
      res.send(payload);
    } catch {
      res.status(502).json({ error: 'Authentication service is unavailable' });
    }
  };
}

module.exports = createProxy();
module.exports.createProxy = createProxy;
module.exports.hasSafeBrowserOrigin = hasSafeBrowserOrigin;
