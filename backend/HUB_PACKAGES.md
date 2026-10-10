# Hub — Verified Sentinel Packages (`sentinel_packages`)

Official 8-record catalog of signed `.spkg` extension packages, served by
`GET /api/v1/hub/packages*` and displayed across the `./hub` frontend
(explore catalog, package detail, landing spotlight, Cmd+K search).

Backend source of truth: `app/models/hub.py::SentinelPackage`,
`app/services/sentinel_packages.py` (seed + `.spkg` bytes),
`app/routers/hub.py::packages_router`. Tests: `tests/test_hub_packages.py`.

---

## 1. Database table

Table `sentinel_packages` (SQLite; created by `Base.metadata.create_all()` on
startup — no migration needed). Column-for-column with the spec SQL, except
`compliance_tags TEXT[]` → `JSON` (SQLite has no arrays):

| Column | Type | Constraints |
|---|---|---|
| `id` | `String(128)` PK | e.g. `org.aryorithm.package.modbus_actuator_guard` |
| `slug` | `String(128)` | unique, indexed |
| `name` | `String(256)` | not null |
| `version` | `String(32)` | not null |
| `tier` | `String(16)` | not null, indexed (`native` \| `wasm` \| `lua`) |
| `tier_display` | `String(64)` | not null |
| `language` | `String(32)` | not null |
| `author` | `String(128)` | not null |
| `verified` | `Boolean` | not null, default `True` |
| `sector` | `String(128)` | not null, indexed (free text, comma-joined) |
| `target_protocol` | `String(64)` | not null, indexed |
| `default_port` | `Integer` | not null, default `0` (`0` = all ports) |
| `latency_sla_ns` | `Integer` | not null |
| `latency_display` | `String(32)` | not null |
| `mitigation_action` | `String(32)` | not null, default `KERNEL_DROP` |
| `compliance_tags` | `JSON` | not null, default `[]` |
| `short_description` | `Text` | not null |
| `technical_details` | `Text` | not null |
| `package_file_name` | `String(128)` | not null |
| `package_file_size_bytes` | `Integer` | not null |
| `signature_algorithm` | `String(32)` | not null, default `Ed25519` |
| `install_command` | `Text` | not null |
| `created_at` / `updated_at` | `DateTime(timezone=True)` | defaults `utcnow` / `onupdate` |

Seeding: `ensure_seed()` runs on every packages endpoint (same lazy pattern
as the plugin registry) and inserts any of the 8 seed slugs that are missing.
It never updates or deletes — operator edits to seeded rows survive restarts.

Seeded slugs: `modbus-actuator-guard`, `s7comm-safety-interlock`,
`log4j-jndi-fastdrop`, `iec104-grid-shield`, `http-rapid-reset-shield`,
`dicom-phi-sanitizer`, `dnp3-water-telemetry`, `mavlink-uav-guardian`
(3× `native`, 3× `wasm`, 2× `lua`; all `verified: true`).

---

## 2. TypeScript interface (frontend contract)

`hub/lib/hub.ts::SentinelPackage` — field-for-field with
`app/schemas/hub.py::SentinelPackageOut`:

```typescript
interface SentinelPackageRecord {
  id: string;                     // "org.aryorithm.package.modbus_actuator_guard"
  slug: string;                   // "modbus-actuator-guard"
  name: string;                   // Display title
  version: string;                // "1.0.0"
  tier: "native" | "wasm" | "lua";
  tier_display: string;           // "Tier A (Native C++20)" | ...
  language: "C++20" | "Rust" | "Lua";
  author: string;
  verified: boolean;
  sector: string;
  target_protocol: string;        // "MODBUS_TCP", "S7COMM", ...
  default_port: number;           // 0 = all ports
  latency_sla_ns: number;
  latency_display: string;        // "< 120 ns"
  mitigation_action: string;      // "KERNEL_DROP" | "ALERT" | "PASS"
  compliance_tags: string[];
  short_description: string;
  technical_details: string;      // rendered as markdown on detail
  package_file_name: string;      // "modbus_actuator_guard.spkg"
  package_file_size_bytes: number;
  signature_algorithm: string;    // "Ed25519"
  install_command: string;        // "nexus-ctl hub install <slug>"
  created_at: string;             // ISO-8601
  updated_at: string;             // ISO-8601
}
```

Typed client (`hub/lib/hub.ts::hub`):

```typescript
hub.sentinelPackages({ sector?, tier?, search? })  // GET /hub/packages
hub.sentinelPackage(slug)                          // GET /hub/packages/{slug}
// download: plain <a href={`${HUB_API_BASE_URL}/hub/packages/${slug}/download`}>
```

---

## 3. API routes

All public (no auth). Filter vocabularies: `tier ∈ native|wasm|lua`
(anything else → `400`); `sector` is a case-insensitive substring match
(sectors are comma-joined free text); `search` matches name, slug, short
description, protocol, and sector.

| Method & Path | Query | Response |
|---|---|---|
| `GET /api/v1/hub/packages` | `?sector=&tier=&search=` (all optional, combinable) | `200` JSON array of full records, ordered by slug |
| `GET /api/v1/hub/packages/{slug}` | — | `200` full record · `404 {"detail": "Package '<slug>' not found"}` |
| `GET /api/v1/hub/packages/{slug}/download` | — | `200 application/octet-stream`, `Content-Disposition: attachment; filename="<package_file_name>"`, `X-Checksum-SHA256: <hex>` · `404` unknown slug |

Example:

```bash
curl 'http://localhost:8000/api/v1/hub/packages?tier=native&search=water'
# → [modbus-actuator-guard, dnp3-water-telemetry]

curl -OJ http://localhost:8000/api/v1/hub/packages/mavlink-uav-guardian/download
# → mavlink_uav_guardian.spkg (18432 bytes, checksum in header)
```

`.spkg` bytes are deterministic stand-ins (`SPKG1:<id>:<version>\n` +
zero padding to `package_file_size_bytes`) until real binaries are published
out-of-band — same philosophy as the registry's `seed_artifact()`. Size,
filename, and checksum header are therefore always self-consistent.

---

## 4. Hub frontend display mapping

| Surface | Source | Fields shown |
|---|---|---|
| Landing spotlight (`hub/app/page.tsx`) | first 4 of `GET /hub/packages` (+ offline fallback) | card grid; metrics ribbon uses real seed values (8 packages, 3 tiers, 100% verified, fastest `< 120 ns`) |
| Terminal teaser | `install_command` of the first two records | copyable `nexus-ctl hub broadcast …` commands |
| Sector tiles (`hub/data/sectors.ts`) | deep links | `/explore?search=<PROTOCOL>` per tile |
| Explore (`hub/app/explore/ExploreView.tsx`) | `GET /hub/packages` with `search/sector/tier` | grid/list, sector + tier rail, chips, empty state, skeletons |
| Package card (`PackageCard.tsx`) | record | verified + tier badges, latency/language/port/action chips, sector, filename + size |
| Detail (`hub/app/packages/[slug]`) | `GET /hub/packages/{slug}` | Overview (`technical_details` markdown) · Security & Compliance (action, tags, signature, port/protocol, SLA) · Package File (name, size, download) + sticky rail + install command |
| Cmd+K (`CommandMenu.tsx`) | `GET /hub/packages?search=` | Top Packages group + Protocols group (distinct `target_protocol`) + SDK docs |
| Publish page + linter | unchanged (`POST /registry/validate`) | registry flow untouched |

Tests: `backend/tests/test_hub_packages.py` (seed count + full-field
fidelity, filters incl. `400` tier, 404s, download headers/size/checksum,
reseed convergence). Full suite: `56 → 61 passed`.
