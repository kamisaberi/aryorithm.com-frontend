# Alignment & Cache Behavior

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


64-byte cache-line alignment and TLB miss optimization.

## Alignment

All tensor origins align to 64 bytes; rows pad to whole lines to kill false sharing.

## TLB

Huge pages for arenas above 2 MB keep miss rates flat at 1.25M EPS.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
