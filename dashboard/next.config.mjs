/** @type {import('next').NextConfig} */
const _buildApiBase = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/api\/v1\/?$/, "");
// Build/start diagnostic: proves which backend this build (or server) uses.
// Must print https://backend.aryorithm.com for host uploads — if it prints
// localhost:8000, a .env.local (or other localhost file) was present and won.
console.log(`[next.config] backend API base: ${_buildApiBase}/api/v1`);

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
