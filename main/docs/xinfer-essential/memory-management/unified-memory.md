# Unified Memory

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Single virtual address spaces shared across heterogeneous SoCs.

## Benefit

No notion of host vs device copies — one pointer is valid everywhere.

## Caveat

First-touch page migration can surprise p99; pre-fault arenas at load.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
