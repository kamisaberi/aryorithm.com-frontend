# xinfer::EngineConfig

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Device targets, precision, zero-copy flags, and worker topology.

## Fields

device_target, precision (FP32/FP16/INT8), enable_zero_copy, worker_threads.

## Defaults

Zero-copy on, workers equal to online cores minus one.

```cpp
xinfer::EngineConfig cfg{
  .device_target = "NPU",
  .precision = xinfer::Precision::FP16,
  .enable_zero_copy = true,
  .worker_threads = 4};
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
