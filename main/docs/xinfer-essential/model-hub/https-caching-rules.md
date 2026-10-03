# HTTPS Caching Rules

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Remote repository synchronization and cache invalidation.

## Validation

ETag + SHA-256 manifest; stale entries revalidate, never silently served.

## Retention

LRU eviction with pinned production generations exempt.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
