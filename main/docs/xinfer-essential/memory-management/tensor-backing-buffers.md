# Tensor Backing Buffers

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Persistent memory ownership, arenas, and buffer pools.

## Arenas

Fixed-size pools sized at graph load; steady-state allocation count is exactly zero.

## Pools

Per-shape freelists recycle backing stores across inferences.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
