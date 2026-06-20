/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
