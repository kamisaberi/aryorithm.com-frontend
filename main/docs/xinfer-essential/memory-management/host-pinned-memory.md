# Host-Pinned Memory

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Non-pageable allocations via cudaHostRegister and mlock for DMA-safe staging.

## When to use

Only where the accelerator cannot import DMA-BUF fds. Pinned memory is the fallback domain.

## Sizing

Pin once at startup; pinning at inference time defeats the purpose.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
