# Memory Domains

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Host, device, host-pinned, and DMA-BUF classification.

## Host

Ordinary pageable memory. Valid for cold paths only; never the hot loop.

## Host-pinned

mlock/cudaHostRegister regions safe for DMA engines to read without page faults.

## Device

Accelerator-local memory; used only when the silicon cannot address host pages.

## DMA-BUF

Exported kernel buffer handles shared by fd across driver boundaries. Preferred domain.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
