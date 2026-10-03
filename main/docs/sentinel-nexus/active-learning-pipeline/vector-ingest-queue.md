# Vector Ingest Queue

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Concurrent lock-free ring buffer with 200k vector capacity.

## Capacity

200k vectors absorb fleet bursts without loss.

## Drain

Flushes at 1,000-vector batches into ForgeBridge storage.

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
