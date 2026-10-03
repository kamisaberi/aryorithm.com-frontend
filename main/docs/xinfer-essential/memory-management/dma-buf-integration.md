# DMA-BUF Integration

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Direct mapping of Linux kernel DMA-BUF descriptors into tensors.

## Flow

Export fd → import into tensor → pass fd to silicon driver. The CPU never touches payload bytes.

## Lifetime

The exporter owns the buffer; tensors hold only a borrowed, fenced view.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
