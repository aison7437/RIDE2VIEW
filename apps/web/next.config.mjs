/** @type {import('next').NextConfig} */
const configuredOrigin = process.env.RIDE2VIEW_API_ORIGIN?.trim();
const isProduction = process.env.NODE_ENV === 'production';
let backend = null;
if (configuredOrigin) {
  const parsed = new URL(configuredOrigin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('RIDE2VIEW_API_ORIGIN must be an origin URL without credentials, paths, or query parameters');
  }
  if (isProduction && parsed.protocol !== 'https:') {
    throw new Error('RIDE2VIEW_API_ORIGIN must use HTTPS in production');
  }
  backend = parsed.origin;
} else if (!isProduction) {
  backend = 'http://127.0.0.1:3000';
}
const nextConfig = {
  async rewrites() {
    // Fail closed in production if the backend has not been configured.
    return backend ? [{ source: '/api/:path*', destination: `${backend}/api/:path*` }] : [];
  },
};
export default nextConfig;
