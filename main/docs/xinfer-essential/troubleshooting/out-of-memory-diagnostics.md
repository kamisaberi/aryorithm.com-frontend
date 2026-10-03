# Out-of-Memory Diagnostics

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Diagnosing IOMMU, DMA allocation, and swap exhaustion.

## DMA pools

dmesg for IOMMU faults; shrink arena sizes or enable huge pages.

## Swap

Swap on the hot path destroys p99; lock arenas with mlock and monitor VmLck.

```bash
$ dmesg | grep -i iommu | tail
$ grep VmLck /proc/self/status
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
