This is the Aryorithm fleet dashboard (Next.js 14). API calls go through one
config module — `lib/config.ts`:

- Local dev: `http://localhost:8000/api/v1` (`dashboard/.env.local`)
- Web host: `https://backend.aryorithm.com/api/v1` (`dashboard/.env.production`)

`NEXT_PUBLIC_*` values bake into client JS at `next build`, so build for the
host with `.env.production` present (committed) and **without** `.env.local`
(git-ignored — never upload it, it would override production).

## Getting Started

First, run the development server:

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy (Node.js web host, e.g. cPanel Setup Node App)

1. On the host, point `backend.aryorithm.com` at the FastAPI backend and
   allow the dashboard origin in its `CORS_ORIGINS`
   (`https://app.aryorithm.com` is already included).
2. Upload the project **without** `.env.local` (git-ignored) and without
   `node_modules`/`.next`. `.env.production` ships the backend URL.
   Keep `NEXT_PUBLIC_NEXUS_API_KEY` in sync with the backend's
   `NEXUS_API_KEY`, or edge polling gets 401s.
3. On the host:
   ```bash
   npm ci
   npm run build   # uses .env.production
   npm run start   # serves app.aryorithm.com (set PORT if the panel needs it)
   ```
4. Local dev is unchanged: `.env.local` (localhost:8000) always wins over
   `.env.production` on your machine. `/api/:path*` rewrites proxy to the
   configured backend for same-origin calls.

## Single sign-on (SSO)

Login once here and you're logged in on hub too (shared `.aryorithm.com`
session cookie — see backend `ROUTES.md` §2). Details:

- Every API call sends `credentials: "include"` (`lib/api.ts`).
- Fresh browser / came from another app with no stored token → the app
  silently restores the session via cookie `POST /auth/refresh`.
- `Logout` calls `POST /auth/logout`: revokes all refresh tokens and clears
  the shared cookies, so hub is logged out at the same time.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
