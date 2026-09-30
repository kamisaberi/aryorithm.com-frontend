/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Strip a trailing /api/v1 from the env URL so the rewrite target
    // never becomes .../api/v1/api/:path* (NEXT_PUBLIC_API_URL already
    // includes /api/v1 for direct client calls in lib/api.ts).
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    ).replace(/\/api\/v1\/?$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
