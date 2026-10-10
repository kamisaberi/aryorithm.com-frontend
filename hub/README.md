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
