# Thread Safety & Concurrency

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Lock-free execution, re-entrancy, and multi-threaded scaling.

## Guarantees

InferenceEngine instances are fully thread-safe; Tensor handles are thread-confined by contract.

## Scaling

Throughput scales linearly to core count on the SPMC ring; pin one worker per core for best p99.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
