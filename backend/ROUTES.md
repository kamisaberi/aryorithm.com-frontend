# Backend API — Routes Guide & Test Handbook

Base URL (local): `http://localhost:8000` · All routers mount under `/api/v1`
(see `app/main.py`). Interactive docs: `http://localhost:8000/docs`.

Companion test suite: `tests/test_*.py` (56 tests, all routes covered).
Run it with:

```bash
cd backend
.venv/bin/python -m pytest tests/ -q
```

> Tests run against an **isolated in-memory SQLite** DB (`get_db` is
> overridden per test), so they never touch your data. Two exceptions:
> a few endpoints run DDL migrations directly on the dev engine
> (`aryorithm.db` gains empty tables — harmless), and the compiler test
> writes `storage/artifacts/COMP-*` dirs which it deletes afterwards.

---

## 1. Authentication primer

| Mechanism | How | Used by |
|---|---|---|
| JWT user | `Authorization: Bearer <access_token>` (from `/auth/login` or `/auth/register`) | Almost everything |
| Admin | Same JWT, but `role` ∈ `super_admin`, `tenant_admin`, `admin` → else `403` | Write/admin routes |
| Nexus API key | `X-API-Key: <NEXUS_API_KEY>` (default `ary_dev_secret_key_8000`) | Edge polling: `fleet/sync`, `threats/global-feed`, `ai/trism/evaluate`, `bot/evaluate`, `tenants/*/commands/pending` |
| Hub CLI token | `Authorization: ApiKey <key>` (from `POST /registry/tokens`) | Hub publishing only |
| Tenant header | `X-Tenant-ID` — **required** on `GET /models*` (value itself is ignored; scoping comes from the JWT), optional elsewhere | `models`, `fleet/sync`, `threats/global-feed`, `ai/trism`, `tenants` |

Error shape (repo convention): `{"detail": "..."}` for 4xx/5xx, and
`{"detail": [{...pydantic errors...}]}` for 422 validation failures.
Hub registry validation errors instead use the RFC-7807 shape from its spec
(`error_code` / `message` / `details[]` / `timestamp_ns`).

Test users are created directly in the test DB (`tests/conftest.py::make_user`,
default role `TENANT_ADMIN`, password `password123`); use
`role=UserRole.SECOPS_ANALYST` for 403-cases.

---

## 2. Authentication & Tenancy — `app/routers/auth.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `POST /api/v1/auth/register` | none | `{name, email, password≥8}` | `201 {access_token, refresh_token, expires_in}`; creates personal tenant + `TENANT_ADMIN` user. `400` short pw, `409` duplicate email |
| `POST /api/v1/auth/login` | none | `{email, password}` | `200` tokens; `401` bad credentials, `403` deactivated account |
| `POST /api/v1/auth/refresh` | none | `{refresh_token}` | `200` fresh access token; `401` unknown/expired/revoked token |
| `GET /api/v1/auth/me` | user | — | `{user_id, email, name, role, tenants:[{id,name}]}` |
| `GET /api/v1/auth/tenants` | admin | — | all tenants for `super_admin`, else own tenant only |
| `POST /api/v1/auth/tenants` | admin | `{name, tier: STARTER\|PRO\|ENTERPRISE}` | `201`; `400` bad tier |
| `POST /api/v1/auth/webauthn/challenge` | none | `{email}` | stub `{challenge, timeout: 60000}` (TODO) |
| `POST /api/v1/auth/webauthn/verify` | none | `{credential_id, signature}` | always `501` (not implemented) |

Tests: `tests/test_auth.py`

---

## 3. Fleet — `app/routers/fleet.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `POST /api/v1/fleet/sync` | JWT or X-API-Key (`X-Tenant-ID` opt) | `{tenant_id, nodes_count, nodes:[{node_id, site?, status?, cpu_pct?, ebpf_drops?, mitigation_latency_us?, sensors:[{sensor_id, …}]…}], nexus_id?, …}` (extra keys ignored) | `{status:"synced", tenant_id, nodes_count, synced, nexus_id, sensors_synced}`; upserts nexus→nodes→sensors, prunes missing sensors |
| `GET /api/v1/fleet/topology` | user | — | `{tenant_id, nexus[], summary}`; stale nexus ⇒ children `UNREACHABLE`, stale node ⇒ `OFFLINE` |
| `GET /api/v1/fleet/nodes` | user | `?status&backend&enclave&enclave_id` (enclave* accepted, ignored) | list; heartbeat older than 15 s forces `OFFLINE`; `status`/`backend` filter case-insensitively |
| `GET /api/v1/fleet/nodes/{node_id}` | user | — | detail + ring/hardware; `404` unknown |
| `POST /api/v1/fleet/nodes/{node_id}/restart` | admin | `{reason}` | `{status:"RESTART_DISPATCHED"}` (stub, any id) |
| `DELETE /api/v1/fleet/nodes/{node_id}` | admin | — | purges node + sensors `{status:"DECOMMISSIONED"}`; `404` unknown |
| `GET /api/v1/fleet/groups` | user | — | 3 default zones when empty, else DB rows with node counts |
| `POST /api/v1/fleet/groups` | admin | `{group_id!, description, scada_mode, max_latency_us / max_allowed_latency_us}` | `201`, upserts on existing id; `400` blank id |
| `GET /api/v1/fleet/enclaves` | user | — | static 3 zones (node counts 14/8/22) |
| `POST /api/v1/fleet/enclaves` | admin | `{enclave_id, max_latency_us?}` | stub `{status:"CREATED"}` |
| `POST /api/v1/fleet/provisioning/tokens` | admin | `{enclave_id, valid_days=7}` | stub `{token:"ZTP-…", expires_at}` |
| `POST /api/v1/fleet/provisioning/enroll` | none | `{tpm_quote, dmi_uuid, token}` | stub `{assigned_node_id:"NODE-new01", heartbeat_sec:5}` |
| `GET /api/v1/fleet/kernel-rules` | user | `?ip` (accepted, ignored) | static 2 rules |
| `POST /api/v1/fleet/kernel-rules/purge` | admin | `{ip}` | `{status:"PURGED_FLEET_WIDE", ip}` |

Tests: `tests/test_fleet.py` (JWT + API-key sync, topology/nodes after sync, restart/decommission incl. 404s, groups CRUD + validation, ZTP, kernel rules, 401/403 matrix).

---

## 4. Threats — `app/routers/threats.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/threats/events` | user | `?limit=50 (1–200)&tactic` (tactic accepted, ignored) | 2 static events |
| `POST /api/v1/threats/broadcast` | user | `{ip!, attributions: [{}…]}` | `{status:"broadcast_dispatched"}` + writes expiring (24 h) `GlobalThreat` row picked up by the feed |
| `GET /api/v1/threats/collective-bus` | user | `?limit=20 (1–100)` | 2 static bus entries |
| `GET /api/v1/threats/mitre` | user | — | 3 static technique hits |
| `GET /api/v1/threats/scada` | user | `?protocol` (uppercased match) | live DB summary + last 50 tenant events |
| `GET /api/v1/threats/ransomware-hashes` | user | — | global (tenant NULL) + own-tenant rows |
| `GET /api/v1/threats/identity-bot` | user | `?type` (accepted, ignored) | static `{impossible_velocity_hits:4, bot_kinematic_blocks:22}` |
| `GET /api/v1/threats/global-feed` | JWT or X-API-Key | `?verbose` | bare `[{ip}]` list by default; `verbose=true` → rich 24 h rows |
| `GET /api/v1/threats/xai` | user | — | stored attributions or 2 reference vectors |

Tests: `tests/test_threats.py` (broadcast→verbose-feed round-trip, DB-seeded SCADA/ransomware, validation 422s, API-key + 401 matrix).

---

## 5. AI & Silicon — `app/routers/ai.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/ai/models` | user | — | tenant inventory, auto-seeded (alias of `/models`) |
| `POST /api/v1/ai/models/upload` | admin | multipart `file` | stub `{model_id:"v3.0", status:"STORED"}` |
| `GET /api/v1/ai/ota/status` | user | — | `{stable_version, candidate_version, stage}` (auto-creates rollout) |
| `POST /api/v1/ai/ota/stage` | admin | `{version!, sha256!, url!}` | stages to `SHADOW_MODE` |
| `POST /api/v1/ai/ota/advance` | admin | — | `SHADOW→CANARY_5_PCT→FLEET_WIDE` (promotes stable at the end) |
| `POST /api/v1/ai/ota/rollback` | admin | — | disables candidate, back to stable `{status, active}` |
| `GET /api/v1/ai/forge/datasets` | user | — | 2 static datasets |
| `POST /api/v1/ai/forge/train` | admin | `{dataset_id!, epochs=50}` | stub `{job_id:"TRAIN-891", status:"QUEUED"}` |
| `POST /api/v1/ai/compiler/compile` | admin | multipart `file` + `target_silicon` (RKNN/TENSORRT/OPENVINO/HAILO_8/QNN) + `precision` (FP32/FP16/INT8) | `201` task `QUEUED`; `400` bad silicon/precision/empty file; writes `storage/artifacts/COMP-*/input.onnx` |
| `GET /api/v1/ai/compiler/tasks/{task_id}` | admin | — | poll 1 → `COMPILING`, poll 2 → `COMPLETED` + `download_url`/sha256/speedup; `404` unknown |
| `GET /api/v1/ai/compiler/artifacts/{task_id}/{filename}` | admin | — | octet-stream (`XFIRMV1:` header); `400` path traversal, `404` not-ready/missing |
| `POST /api/v1/ai/trism/evaluate` | JWT or X-API-Key | `{prompt_text!, user_id?, sanitize_pii=true}` | jailbreak→`BLOCKED`, PII→`REDACTED`, else `FORWARDED`; always writes audit row |

Tests: `tests/test_ai.py` (full OTA + compiler lifecycle incl. error branches, TRiSM verdicts, auth matrix; cleans up `COMP-*` dirs it creates).

---

## 6. Compliance — `app/routers/compliance.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/compliance/nis2` | user | — | `{overall_status, compliance_score_pct, statutory_mandates[3]}` from live fleet latency |
| `GET /api/v1/compliance/iec62443` | user | — | static `{standard:"IEC 62443-3-3", system_integrity:"PASS", zones_verified:14}` |
| `GET /api/v1/compliance/cmmc` | user | — | `{certified_level, controls_*, score_percentage, key_findings[4]}` |
| `POST /api/v1/compliance/export` | user | `{framework!, format=PDF\|JSON, include_sla_proofs=true, reporting_period_days=30}` | JSON → manifest + `manifest_sha256`; PDF → `application/pdf` download |
| `GET /api/v1/compliance/sbom` | user | — | CycloneDX 1.5 document |
| `GET /api/v1/compliance/attestation-logs` | user | `?node_id` (accepted, ignored) | 2 static TPM quotes |
| `GET /api/v1/compliance/insurance-proof` | user | — | `TIER_A_PLUS` proof + writes an `InsuranceProof` row per call |

Tests: `tests/test_compliance.py`.

---

## 7. DFIR — `app/routers/dfir.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/dfir/pcaps` | user | `?limit=20` (accepted, ignored) | 2 static vault entries |
| `GET /api/v1/dfir/pcaps/{pcap_id}/download` | user | — | `application/vnd.tcpdump.pcap` stub (any id, never 404) |
| `POST /api/v1/dfir/cdr/sanitize` | user | multipart `file` | Office XML is re-zipped minus macros/executables (`MACROS_STRIPPED` + `X-Threats-Removed`); anything else passes `CLEAN` |
| `POST /api/v1/dfir/firmware/dissect` | admin | multipart `file` | `{task_id:"FSE-…", status:"ANALYZED"}`; ARM/MIPS/x86 heuristics, hardcoded-secret + BusyBox findings, `CRITICAL/HIGH/LOW_RISK` score; persists `FirmwareReport` (tenant-scoped) |
| `GET /api/v1/dfir/firmware/reports/{task_id}` | user | — | stored report mapped to response shape; unknown id → legacy 2-CVE fallback (never 404) |

Tests: `tests/test_dfir.py` (real zip with macro stripped, credential finding, fallback shape, admin gate).

---

## 8. Cyber Range — `app/routers/range.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/range/twins` | user | — | 2 static twins |
| `POST /api/v1/range/twins` | admin | `{name!, node_profiles=[]}` | stub `{twin_id:"TWIN-new01", status:"PROVISIONED"}` |
| `POST /api/v1/range/twins/{twin_id}/start` | user | — | `{status:"RUNNING", sandbox_ip:"10.240.0.1"}` (any id) |
| `POST /api/v1/range/twins/{twin_id}/stop` | user | — | `{status:"TERMINATED"}` |
| `POST /api/v1/range/attacks/replay` | user | `{malware!, target!}` | `{status:"STREAMING", frames_injected:120}` |
| `GET /api/v1/range/resilience/score` | user | — | same as bench (also appends a history row) |
| `GET /api/v1/range/blueprints` | user | — | 4 blueprints (substation/hospital/refinery/maritime) |
| `GET /api/v1/range/instances` | user | — | live tenant instances (non-terminated); `INITIALIZING` rows flip to `RUNNING` on read |
| `POST /api/v1/range/instances/provision` | admin | `{blueprint_id!, enclave_name="", duration_hours=2.0, traffic_profile=…}` | `202`; `400` unknown blueprint; IP `10.240.0.x` |
| `POST /api/v1/range/instances/{id}/pause` | admin | — | `PAUSED`; `404` if missing/terminated |
| `POST /api/v1/range/instances/{id}/resume` | admin | — | `RUNNING`; `404` unless currently `PAUSED` |
| `GET /api/v1/range/resilience/history` | user | — | `[{score, evaluated_at}]` chronological (bench/score/certify append here) |
| `DELETE /api/v1/range/instances/{id}` | admin | — | marks `TERMINATED` (row kept); `404` unknown |
| `GET /api/v1/range/resilience/bench` | user | — | score/tier/metrics from live node latencies + appends history |
| `POST /api/v1/range/resilience/certify` | admin | — | `resilience_certificate.pdf` download (appends history) |

Tests: `tests/test_range.py` (full provision→pause→resume→terminate lifecycle with 404 branches, history growth, PDF headers).

---

## 9. Settings — `app/routers/settings.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/settings/api-keys` | admin | — | 2 stub keys |
| `POST /api/v1/settings/api-keys` | admin | `{name!, scopes=[]}` | stub `{api_key:"ary_live_…"}` (raw secret shown once) |
| `DELETE /api/v1/settings/api-keys/{key_id}` | admin | — | stub `{status:"REVOKED"}` (any id, never 404) |
| `GET /api/v1/settings/webhooks` | admin | — | 2 stub webhooks |
| `POST /api/v1/settings/webhooks` | admin | `{url!, events=[]}` | stub `{webhook_id:"wh_new01", status:"ACTIVE"}` |
| `GET /api/v1/settings/billing` | admin | — | stub `{active_nodes:124, licensed_nodes:150, renewal_date}` |
| `GET /api/v1/settings/audit-logs` | user | `?page=1&limit=50 (1–200)` | 2 stub entries (only non-admin route here) |

Tests: `tests/test_settings.py` (stubs, validation 422s, admin gates).

---

## 10. Overview / Stream / Tenants — `overview.py`, `stream.py`, `tenants.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/overview/metrics` | user | `?enclave_id` (ignored) | static `{online_nodes:124, total_drops:142080, mean_sla_us:0.84, stable_model:"v2.4"}` |
| `GET /api/v1/overview/threat-map` | user | — | 2 static coordinates |
| `GET /api/v1/overview/latency-distribution` | user | `?window=24h` (ignored) | static p50–p999 |
| `GET /api/v1/xai/recent` | user | `?limit=10 (1–50)` | 2 static attributions |
| `GET /api/v1/xai/{incident_id}` | user | — | static residuals detail, id echoed |
| `GET /api/v1/stream/telemetry` | user | — | infinite SSE (`heartbeat_sync/drop_event/xai_attribution/node_offline`, 5 s cycle) |
| `GET /api/v1/stream/threats` | user | — | same SSE generator, alerts flavor |
| `GET /api/v1/tenants/{tenant_id}/commands/pending` | JWT or X-API-Key | — | always `[]` (nexus polls every ~10 s) |

Tests: `tests/test_overview.py`. SSE note: httpx's ASGI transport
buffers the whole body, so infinite streams can never be read over HTTP
in-process — the test calls the route functions directly and asserts
media type, headers, and first yielded frames instead.

---

## 11. Models / OTA / Plans — `models.py`, `ota.py`, `plans.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/models` (+`/` alias) | user | **required** `X-Tenant-ID` header (else 422) | tenant inventory, auto-seeds 2 baseline + 3 web models; `{filename, sha256, size_bytes, download_url, stage}` |
| `GET /api/v1/models/{filename}` | user | required `X-Tenant-ID` | local file → octet-stream; `http…` URL → 302; `400` traversal/non-onnx; `404` unknown row or missing binary (seeded rows have no local file) |
| `GET /api/v1/ota/status` | user | — | `{stable_version, candidate_version, stage}` (auto-creates rollout) |
| `POST /api/v1/ota/stage` | admin | `{version!, sha256!, url!}` | upserts model row + candidate to `SHADOW_MODE` |
| `POST /api/v1/ota/advance` | admin | — | steps `SHADOW→CANARY_5_PCT→FLEET_WIDE`, promotes stable at the end |
| `POST /api/v1/ota/rollback` | admin | — | disables candidate `{status, active:stable}` |
| `GET /api/v1/plans` (+`/` alias) | none (public) | — | full matrix, auto-seeds 4 plans + 93 entitlement rows on first call |
| `PATCH /api/v1/plans/{slug}` | admin | any subset of plan fields (`extra="ignore"`) | `404` unknown slug |
| `PATCH /api/v1/plans/items/{item_id}` | admin | `{item_label?, item_sub?, values?}` | `404` unknown id |

Tests: `tests/test_models.py` (header-required 422, traversal 400, seeded-download 404, full OTA cycle, matrix auto-seed + patches + 403/404s).

---

## 12. CPS / Identity — `cps.py`, `identity.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/cps/medical/scanners` | user | — | scanners joined to live sensors (`SECURE_ACTIVE` vs `FAULT_NO_DATA`) |
| `GET /api/v1/cps/medical/pacs-events` | user | — | last 50 DICOM/C-STORE scada events as `MED-SEC-…` synthetic ids |
| `GET /api/v1/cps/maritime/vessels` | user | — | vessels + per-node threat counts |
| `GET /api/v1/threats/itdr/events` | user | — | tenant ITDR events, newest first |
| `POST /api/v1/threats/itdr/revoke-session` | admin | `{user_principal_name!, reason=""}` | `SESSION_REVOKED` + timestamp; `404` unknown principal |
| `POST /api/v1/bot/evaluate` | JWT or X-API-Key | `{session_id!, kinematic_vectors:[{x,y,dt_ms}]…, keystroke_jitter_ms?}` | kinematic heuristics → `AUTOMATED_BOT`/`HUMAN_VERIFIED` + factors/action |
| `GET /api/v1/ztna/sessions` | user | — | risk tiers `CRITICAL≥0.8 / ELEVATED≥0.5 / WATCH≥0.2 / LOW`, quarantined ⇒ access revoked |

Tests: `tests/test_cps_identity.py` (DB-seeded scanners/events/vessels/ITDR/ZTNA incl. tier mapping, bot human-vs-kinematic verdicts, revoke branches, API-key + 401 paths).

---

## 13. SOC / Support — `soc.py`, `support.py`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/soc/incidents` | user | — | tenant incidents, newest first |
| `GET /api/v1/soc/incidents/{incident_id}` | user | — | detail + messages + hardcoded `pcap_links`; `404` unknown |
| `POST /api/v1/soc/incidents/{incident_id}/messages` | user | `{author="customer", author_role="customer", body!}` | `400` blank body (after strip, truncated to 2000 chars); `404` unknown incident |
| `POST /api/v1/support/emergency-dispatch` | admin | `{affected_enclave!, urgency="PHYSICAL_SAFETY_RISK", incident_notes=""}` | `DISPATCH-RED-…`, `ENGINEERS_PAGED`, 15-min SLA, bridge link; `400` blank enclave |
| `GET /api/v1/support/sla-history` | user | — | tenant dispatches (`PAGED` vs `RESPONDED`, `sla_met` vs 900 s) |

Tests: `tests/test_soc.py` (message flow incl. 400/404 branches, dispatch + history status derivation, admin gates).

---

## 14. Licensing & Hub

Already covered before this pass: `tests/test_licenses.py` (subscribe/activate/portal-download/verify/revoke + legacy aliases) and `tests/test_hub.py` (catalog, facets, versions, download/security headers, validate/publish/yank, tokens, star, telemetry, check-updates, airgap bundle).

### 14b. Verified sentinel packages — `app/routers/hub.py::packages_router`

| Method & Path | Auth | Request | Response / Notes |
|---|---|---|---|
| `GET /api/v1/hub/packages` | none (public) | `?sector=&tier=&search=` (all optional) | `200` JSON array of full records ordered by slug; `tier` must be `native\|wasm\|lua` else `400` |
| `GET /api/v1/hub/packages/{slug}` | none (public) | — | `200` full record; `404` unknown slug |
| `GET /api/v1/hub/packages/{slug}/download` | none (public) | — | `200 application/octet-stream` + `Content-Disposition: attachment; filename="<file>.spkg"` + `X-Checksum-SHA256`; deterministic seed bytes padded to `package_file_size_bytes`; `404` unknown slug |

Tests: `tests/test_hub_packages.py` (8-record seed + field fidelity, filters, 404s, download headers/size/checksum). Full guide: `HUB_PACKAGES.md` (schema, TS interface, routes, hub display mapping).

---

## 15. Test quirks worth knowing

- `Telemetry`/`stream` SSE routes can't be read over `ASGITransport` (it buffers infinite bodies); tests invoke the route functions directly.
- Several endpoints run DDL (`create_all`) against the **real** `aryorithm.db` engine even under test override — harmless (empty tables), restore with `git checkout -- aryorithm.db` if it shows modified.
- The compiler test only deletes `storage/artifacts/COMP-*` dirs it created (snapshot-diffed); committed sample artifacts are never touched.
- `GET /models*` 422s without `X-Tenant-ID` — always send the header.
- Admin-only routes return `403` for analyst roles; unauthenticated returns `401` with a `WWW-Authenticate: Bearer` header.
