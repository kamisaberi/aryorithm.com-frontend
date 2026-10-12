/** @type {import('next').NextConfig} */
// Build/start diagnostic: proves which backend this build (or server) uses.
// Must print https://backend.aryorithm.com for host uploads — if it prints
// localhost:8000, a .env.local (or other localhost file) was present and won.
console.log(
  `[next.config] backend API base: ${process.env.NEXT_PUBLIC_HUB_API_URL || "http://localhost:8000/api/v1"}`
);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
