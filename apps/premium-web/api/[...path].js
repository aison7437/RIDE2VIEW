'use strict';

const ALLOWED = new Set([
  'config', 'auth/login', 'auth/logout', 'auth/me', 'auth/register',
  'auth/email/challenges', 'auth/email/recovery/challenges', 'auth/phone/challenges',
  'auth/email/link/challenges', 'auth/phone/link/challenges', 'auth/challenges/verify'
]);

function createProxy({ env = process.env, fetchFn = fetch } = {}) {
  return async function proxy(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const pathParts = Array.isArray(req.query?.path) ? req.query.path : [req.query?.path].filter(Boolean);
    const path = pathParts.join('/');
    if (!ALLOWED.has(path)) { res.status(404).json({ error: 'Not found' }); return; }
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); res.status(405).json({ error: 'Method not allowed' }); return; }
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
