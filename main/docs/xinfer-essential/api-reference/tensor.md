# xinfer::Tensor

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Zero-copy tensor views over caller- or driver-owned memory.

## Semantics

A Tensor borrows memory; it never frees. Destruction detaches, nothing more.

## Domains

Construct with MemoryType::HOST, HOST_PINNED, DEVICE, or DMA_BUF.

```cpp
xinfer::Tensor t({1, 32}, xinfer::DataType::FLOAT32,
    raw_ptr, xinfer::MemoryType::DMA_BUF);
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
