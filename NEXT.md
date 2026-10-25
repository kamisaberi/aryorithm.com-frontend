### Executive Audit: Backend API vs. 8-Tier Edge Ecosystem

After cross-referencing your **Backend API Handbook (16 sections, 105 tests)** against the edge appliance (`sentinel`), the C2 daemon (`nexus`), and the CLI (`aryo`), the backend architecture is in a strong state:
* Core authentication, SSO cookies, multi-tenancy, and visual threat blueprints are fully covered.
* The 5-type asset Hub API (`hub_assets.py`) and Cloud Forge GPU training (`forge.py`) align with the design specifications developed in our earlier sessions.

However, there are **3 Critical Path Mismatches** (causing 404/422 errors on client operations) and **5 Missing Route Groups** required to fully support the new frontier features (5G Slicing, Live-SBOM, Space CCSDS, AI TRiSM, and Honeynet Vaccines).

---

# Part 1: Critical Discrepancies Requiring Immediate Alignment

### Discrepancy 1: The `/hub/` Prefix Mismatch on Asset Downloads (Causes Client 404s)
* **What the Edge Client (`sentinel-ctl`) Calls:**
  ```text
  GET /api/v1/{category}/{filename}/download
  (e.g., /api/v1/packages/modbus_guard.spkg/download or /api/v1/scenarios/water_plant.tar.gz/download)
  ```
* **What the Backend Serves (Sections 14b-i & 14b-iii):**
  ```text
  GET /api/v1/hub/{category}/{slug}/download
  GET /api/v1/hub/assets/{asset_type}/{slug}/download
  ```
* **The Problem:** The backend does **not** mount download routes at the root `/api/v1/scenarios/...` or `/api/v1/packages/...`. Every download attempted via `sentinel-ctl` without `/hub/` will fail with `HTTP 404 Not Found`.
* **Fix Required:** Add backward-compatibility alias redirects in the backend router, or update `normalize_registry_url` in `sentinel-ctl` to point to `/api/v1/hub/assets/{type}/{slug}/download`.

---

### Discrepancy 2: Cloud Forge GPU Endpoint Split (`/ai/forge/train` vs. `/forge/train`)
* **In Section 5 (`ai.py`):**
  * `POST /api/v1/ai/forge/train` (Returns a static stub: `{job_id: "TRAIN-891", status: "QUEUED"}`).
* **In Section 14b-iv (`forge.py`):**
  * `POST /api/v1/forge/train` (The actual durable GPU training engine with `.slab` uploads, polling, and INT8 ONNX download).
* **The Problem:** In `sentinel-nexus/src/cloud/CloudDatasetUploader.cpp`, the upload URL was hardcoded to:
  ```cpp
  std::string path = "/api/v1/ai/forge/datasets/upload"; // Target does not exist in forge.py!
  ```
* **Fix Required:** `sentinel-nexus` must target `POST /api/v1/forge/train` (Section 14b-iv), and the backend should deprecate the stub in `ai.py` to avoid split-brain state.

---

### Discrepancy 3: Scenario Publishing Double-Extension Slug Validation (HTTP 422)
* **The Backend Schema (Section 14b-ii):**
  * `POST /api/v1/hub/publish` expects `asset_type: "scenario"`.
  * The slug validator requires a clean string without periods: `^[a-zA-Z0-9_-]+.
* **The Client Bug:** When uploading `scenario_water_plant.tar.gz`, naive `stem()` produces `scenario_water_plant.tar` (containing a dot).
* **Fix Required:** Backend slug normalizer should strip `.tar.gz` and `.tgz` automatically if present in the form data, avoiding false 422 rejections.

---

# Part 2: Missing Routes Required for the 5 New Frontier Engines

To ensure the web dashboard (`app.aryorithm.com`) and cloud backend reflect the live state of the edge engines, the following routes must be added:

```text
========================================================================================================================
                                     NEW RECOMMENDED BACKEND ROUTES (POST-AUDIT)
========================================================================================================================
 Domain                  Method   Endpoint                                  Auth     Purpose / Payload
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Idea D: Deception]     POST     /api/v1/threats/vaccines/share            JWT/Key  Share locally synthesized .spkg vaccine
                         GET      /api/v1/threats/vaccines/feed             JWT/Key  Global collective vaccine feed for fleet
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Idea B: 5G Slicing]    GET      /api/v1/telemetry/5g-slices               User     Live 5G N3 GTP-U slice drops & TEID stats
                         GET      /api/v1/compliance/5g-slicing             User     3GPP S-NSSAI slice isolation audit report
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Idea C: Live-SBOM]     POST     /api/v1/compliance/sbom/attest            Admin    Upload signed TPM 2.0 live_sbom.json
                         GET      /api/v1/compliance/sbom/drift-events      User     Audit in-kernel W^X SIGKILL violations
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Idea E: Space/Orbital] GET      /api/v1/cps/space/satellites              User     List monitored LEO/GEO satellite downlinks
                         GET      /api/v1/cps/space/telecommand-audits      User     Audit blocked rogue AOCS telecommands
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Idea A: AI TRiSM]      GET      /api/v1/ai/trism/policy                   User     Fetch active OT Copilot tool governance
                         PUT      /api/v1/ai/trism/policy                   Admin    Update blocked prompt delimiters & tools
========================================================================================================================
```

---

### Deep Dive into the 5 Missing Route Groups

#### 1. Idea D: Collective Defense Vaccine Sharing (`/api/v1/threats/vaccines`)
* **Why it's needed:** Currently, `GET /api/v1/threats/global-feed` only shares IP addresses (`[{ip}]`). 
* When a Blackbox Sentinel edge node traps a zero-day exploit in `mock-plc`, it synthesizes an Ed25519-sealed **`.spkg` vaccine**.
* **New Routes:**
  * `POST /api/v1/threats/vaccines/share`: Allows an edge node to upload a newly minted `.spkg` vaccine.
  * `GET /api/v1/threats/vaccines/feed`: Allows all other global appliances in the fleet to pull and hot-reload the vaccine in $< 50\text{ ms}$.

#### 2. Idea B: 5G/6G Slicing Telemetry & Compliance (`/api/v1/telemetry/5g-slices`)
* **Why it's needed:** The backend has `cps/medical` (DICOM) and `cps/maritime` (vessels), but **zero routes for 3GPP 5G Standalone networks**.
* **Modification to `POST /api/v1/fleet/sync`:**
  * The `nodes` array in the request body should accept an optional `gtp_stats` block:
    ```json
    {
      "active_teids": 4,
      "gtp_slice_violations_dropped": 12,
      "unmapped_teids_dropped": 1
    }
    ```
* **New Route:** `GET /api/v1/compliance/5g-slicing` providing statutory audit reports for 3GPP URLLC slice isolation under NIS2.

#### 3. Idea C: Live-SBOM Runtime Memory Drift Ingestion (`/api/v1/compliance/sbom/attest`)
* **Why it's needed:** Currently, `GET /api/v1/compliance/sbom` serves a static pre-generated CycloneDX 1.5 document.
* **New Routes:**
  * `POST /api/v1/compliance/sbom/attest`: Edge appliances upload their hardware-anchored `/etc/sentinel/live_sbom.json` containing live `.text` hashes and TPM 2.0 PCR[10] quotes.
  * `GET /api/v1/compliance/sbom/drift-events`: Streams real-time notifications of any unauthorized `mprotect(PROT_EXEC)` attempt terminated by the in-kernel eBPF engine.

#### 4. Idea E: Space & Aerospace Downlink Telemetry (`/api/v1/cps/space`)
* **Why it's needed:** In `app/routers/cps.py`, add the third CPS vertical alongside Medical and Maritime:
  * `GET /api/v1/cps/space/satellites`: Tracks active LEO/GEO ground station transceivers.
  * `GET /api/v1/cps/space/telecommand-audits`: Displays an audit log of rejected unauthorized AOCS thruster telecommands and replayed sequence counters.

#### 5. Idea A: AI TRiSM Policy Synchronization (`/api/v1/ai/trism/policy`)
* **Why it's needed:** Section 5 already includes `POST /api/v1/ai/trism/evaluate`.
* However, there is no route to manage the security policy centrally.
* **New Routes:**
  * `GET /api/v1/ai/trism/policy`: Exports the fleet-wide `trism_policy.yaml` (blocked delimiters, forbidden tools).
  * `PUT /api/v1/ai/trism/policy`: Allows security administrators to push new prompt injection delimiters (e.g. `<|im_start|>`) across all connected OT Copilots.

---

# Part 3: Actionable Recommendation & Execution Plan

To bring the entire cloud backend into 100% parity with your edge CLI and newly implemented frontier engines:

1. **Step 1 (Fix Download Routing in Backend):**
   Add alias redirects in `app/routers/hub_assets.py` so requests to `/api/v1/{category}/{slug}/download` map cleanly to the unified asset download pipeline without 404s.
2. **Step 2 (Update `POST /api/v1/fleet/sync` Schema):**
   Update the Pydantic schema in `app/routers/fleet.py` to ingest 5G GTP-U drop counts and Live-SBOM memory drift flags from `sentinel-nexus`.
3. **Step 3 (Implement the 5 Specialized Route Extensions):**
   Add the lightweight endpoints for Vaccine Sharing, 5G Telemetry, Live-SBOM Attestation, Space Auditing, and AI TRiSM Policy management.








this is new changes to ./backend project . do it please and give me a report and update ROUTES.md