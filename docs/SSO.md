# Single sign-on (one login, three sites)

Login on dashboard, hub, or main → logged in everywhere. Logout anywhere →
logged out everywhere. Two cooperating layers; either alone degrades
gracefully, together they cover bookmarks, typed URLs, and new tabs.

## Layer 1 — shared-domain session cookies (primary)

On `login`/`register`/`refresh` the backend mirrors the JWTs into HttpOnly
cookies `ary_access` (30 min) / `ary_refresh` (7 days):
`HttpOnly; Secure (https only); SameSite=Lax; Path=/; Domain=.aryorithm.com`.
All frontends send `credentials: "include"`. Auth resolution order in
`get_current_user`: `Authorization: Bearer` header first, `ary_access`
cookie second.

- Empty-body `POST /auth/refresh {}` authenticates purely by cookie (silent
  bootstrap for apps with no stored token).
- `POST /auth/logout` revokes **all** of the caller's refresh tokens and
  clears both cookies (global logout).
- Security: JS can never read the tokens (strictly safer than localStorage
  JWTs); `SameSite=Lax` blocks cross-*site* fetch/POST from attacker origins
  while allowing our same-site subdomain calls; every `GET` is read-only.
- Local dev: `COOKIE_DOMAIN` empty → host-only cookies (browsers reject
  `Domain=localhost`); `Secure` off on plain http. Prod: `COOKIE_DOMAIN`
  must be `.aryorithm.com` (leading dot) in the host backend `.env`.

## Layer 2 — shared token store (bridge)

`localStorage` is per-origin, so the three subdomains share one store
through a hidden iframe: `main/app/auth-bridge/page.tsx` owns it (main
origin's localStorage), answering typed `{type:"ary-sso:request", ns:"ary-sso"}`
get/set/remove messages over `postMessage` with strict origin +
`aryorithm_*`-key checks. Replies carry `type:"ary-sso:response"` and are
ignored by the bridge (messages without a valid `op` are never answered), so
two bridge frames can no longer bounce messages forever. The route is rendered
without the public site chrome, so it never boots a second account widget.
Untyped requests from older builds are still accepted during rollout.
Identical `shared-storage.ts` client in each app (bridge first, own
localStorage as fallback when main isn't running in dev).

- Dashboard tokens live there (not per-origin localStorage); login/register/
  logout on any app read/write the same keys.
- Hub `lib/session.ts` / main `lib/session.ts`: shared-token `Bearer` first,
  silent cookie refresh as fallback.
- Auth home stays the dashboard (`/login`, `/register`); hub and main keep
  local auth pages posting to the same backend endpoints.

## Roles (integrated authorization)

Role + tenants travel in the JWT and `GET /auth/me`
(`super_admin`/`tenant_admin`/`admin` ⇒ admin). Enforcement: backend
`get_current_admin` (source of truth, 403s); dashboard `RequireAdmin` guard
on `/settings*` + sidebar role line; hub role chip; main profile admin
shortcut. Registry publishing still needs `packages:publish` ApiKey scope —
separate machine credential by design.

## Testing it

1. Backend: `tests/test_sso_cookies.py` (issue → cookie-only `/me` →
   cookie-only refresh → logout revokes+clears).
2. Bridge protocol: temporary `sso-test.html` harness (since removed) gave
   `load:set:get:keyguard:remove:gone` all PASS cross-origin in headless Chrome.
3. Manual: log in on one origin, open the other two in new tabs — header/
   avatar/profile show the member; logout on one drops all three on next load.

## Troubleshooting

- Hub/main don't see the dashboard login → host backend missing
  `COOKIE_DOMAIN=.aryorithm.com`, or apps serving pre-SSO builds (rebuild +
  reupload + restart all three), or third-party-cookie blocking (irrelevant
  here — same-site, but check anyway).
- Session dies after ~30 min on hub/main only → cookie refresh failing:
  backend `.env` CORS must list the frontend origin **and** the browser must
  send cookies (`credentials: "include"` — already in all clients).
- Local dev: run all three dev servers (dashboard `:3000`, hub `:3001`,
  main `:3002`) so the bridge origin exists; otherwise the localStorage
  fallback engages and cross-app sync pauses.
