# Cloud Fleet Sync

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


POST /fleet/sync nested 4-tier tree transmission every 5s.

## Payload

Full tenant→nexus→node→sensor tree, heartbeat-annotated.

## Backoff

Jittered retries preserve ordering guarantees.

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
