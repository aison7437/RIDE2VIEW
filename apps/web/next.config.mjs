/** @type {import('next').NextConfig} */
const backend = process.env.RIDE2VIEW_API_ORIGIN || 'http://127.0.0.1:3000';
const nextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};
export default nextConfig;
