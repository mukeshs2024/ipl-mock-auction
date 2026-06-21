/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: `${(process.env.NEXT_PUBLIC_API_URL || 'https://ipl-mock-auction-3aqu.onrender.com').replace(/\/$/, "")}/socket.io/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
