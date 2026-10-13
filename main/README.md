# Aryorithm main site (aryorithm.com) — Next.js 14

Marketing + docs site. Holds no credentials: auth lives on the dashboard,
and the header/profile read the shared SSO session cookie (see backend
`ROUTES.md` §2).

## Local dev ports (all three frontends + backend)

| App       | Command                  | URL                    |
|-----------|--------------------------|------------------------|
| backend   | `uvicorn app.main:app`   | http://localhost:8000  |
| dashboard | `npm run dev`            | http://localhost:3000  |
| hub       | `PORT=3001 npm run dev`  | http://localhost:3001  |
| main      | `PORT=3002 npm run dev`  | http://localhost:3002  |

Each app must keep its own port — e.g. main on `:3000` would shadow the
dashboard and its `/login` + `/register` pages would 404.

## Login / Register / Profile

There are deliberately **no** local auth forms here. The header's
Login/Register link to the dashboard (`NEXT_PUBLIC_DASHBOARD_URL` +
`/login`, `/register`); the shared `.aryorithm.com` session cookie logs
the member in everywhere. Logged-in members get an avatar → `/profile`
(member card, dashboard/hub shortcuts, global logout).

## Env files

- `.env.local` — localhost trio (dev). Never upload.
- `.env.production` — `backend`/`app`/`hub.aryorithm.com` (baked at build).
- `.env.example` — documented template.

## Deploy (Node.js web host)

```bash
npm ci
npm run build   # uses .env.production; check the
                # "[next.config] backend API base: https://backend.aryorithm.com/api/v1" line
npm run start   # serves aryorithm.com (set PORT if the panel needs it)
```

Upload without `.env.local`, `node_modules`, `.next`. The backend must list
`https://aryorithm.com` in its `CORS_ORIGINS` (already in `.env.example`).
