# Staged Rollout Lifecycle

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


State machine: SHADOW_MODE → CANARY_5_PCT → FLEET_WIDE.

## Shadow

Passive scoring beside stable; telemetry only, zero drops.

## Canary

Deterministic 5% hash cohort enforces for real.

## Fleet

Full promotion only after validation windows pass.

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
