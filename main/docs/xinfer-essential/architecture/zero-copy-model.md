# Zero-Copy Model

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Eliminating memcpy bottlenecks at wire speed.

## Ownership rule

Buffers are owned by the caller or the driver — never the runtime. xinfer::Tensor is a view, not an allocation.

## Budget math

One staging memcpy costs ~0.9µs: the entire drop budget. Zero-copy is not an optimization here; it is the SLA.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
