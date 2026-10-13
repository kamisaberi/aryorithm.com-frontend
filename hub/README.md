# Aryorithm Hub — extension & plugin marketplace frontend

Next.js 14 storefront for `hub.aryorithm.com`, backed by the `./backend`
Hub API (`/api/v1/plugins`, `/registry`, `/sync`, `/telemetry`).

## Run

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_HUB_API_URL at your backend
npm run dev                  # http://localhost:3001
```

The backend runs on `:8000` by default (`NEXT_PUBLIC_HUB_API_URL`).

## Deploy (Node.js web host, e.g. cPanel Setup Node App)

1. On the host, point `backend.aryorithm.com` at the FastAPI backend and
   allow the hub origin in its `CORS_ORIGINS`
   (`https://hub.aryorithm.com` is already included).
2. Upload the project **without** `.env.local` (git-ignored) and without
   `node_modules`/`.next`. `.env.production` ships the backend URL:
   `NEXT_PUBLIC_HUB_API_URL=https://backend.aryorithm.com/api/v1`.
3. On the host:
   ```bash
   npm ci
   npm run build   # uses .env.production
   npm run start   # serves hub.aryorithm.com (set PORT if the panel needs it)
   # …or `node server.js` (custom server, same thing)
   ```
4. Local dev is unchanged: `.env.local` (localhost:8000) always wins over
   `.env.production` on your machine.

## Single sign-on (SSO)

A dashboard login is automatically recognized here — the header shows the
member and a global Logout (shared `.aryorithm.com` session cookie, no
token to store; see backend `ROUTES.md` §2). Details:

- Every API call sends `credentials: "include"` (`lib/api.ts`).
- `lib/session.ts`: `getSession()` (via cookie `GET /auth/me`),
  `hubLogout()` (global logout), `dashboardUrl()` for the "Sign in"
  handoff (`NEXT_PUBLIC_DASHBOARD_URL`: `http://localhost:3000` dev,
  `https://app.aryorithm.com` prod).
- Web publishing still uses CLI `ApiKey` tokens by design (separate
  machine credential); the session covers identity/logout.

## Structure

- `app/` — landing `/`, catalog `/explore`, detail `/plugins/[slug]`,
  publishing `/publish`, SDK docs `/docs`
- `components/layout` — sticky glass header, footer, mobile drawer
- `components/search` — global `Cmd+K` spotlight menu
- `components/ui` — badges, copy buttons, skeletons, terminal
- `components/hub` — plugin cards, filter rail, install modal, linter
- `lib/` — typed API client (`api.ts`, `hub.ts`), formatters
- `data/` — sector tiles, SDK docs content, offline fallbacks

Design tokens (void/panel/hairline, cyan/kernel/threat/telemetry,
Space Grotesk / Inter / JetBrains Mono) match `../main` and `../dashboard`.
