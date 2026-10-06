# Technical Frequently Asked Questions (FAQ)

---

### Q1: Can I load PyTorch `.pt` or TensorFlow SavedModel files directly into `xinfer`?
**No.** `xinfer-essential` is designed for low-latency operational environments and avoids embedding Python interpreters or full training frameworks. Models must be exported to standardized execution formats—such as **ONNX (Opset 11–17)**, OpenVINO IR, TensorRT `.engine`, or vendor binaries (`.rknn`, `.hef`)—before deployment.

---

### Q2: How does `xinfer` achieve zero heap allocations in the forward pass?
All tensor backing buffers, scratchpads, dynamic memory queues, and device descriptors are allocated and pinned during `InferenceEngine::initialize()`. During `forward()`, inputs are processed directly in-place through pre-mapped memory buffers, invoking zero calls to `malloc()`, `free()`, `new`, or `delete`.

---

### Q3: What happens if an edge hardware accelerator crashes or overheats?
`xinfer-essential` isolates driver errors at the `IInferencePlugin` boundary. If an accelerator encounters a hardware fault (e.g., PCIe timeout or driver crash), the engine catches the low-level failure, releases driver resources safely, and throws a typed `InferenceException`. If configured, it automatically redirects the next inference pass to the optimized SIMD CPU reference backend.

---

### Q4: Does `xinfer` transmit any metrics or telemetry over the internet?
**No.** `xinfer-essential` enforces a $\$0.00$ cloud egress model. It creates zero background threads, telemetry sockets, or external network connections. External HTTPS communication occurs only if you explicitly invoke `xinfer::ModelHub` with remote synchronization enabled. In air-gapped deployments, setting `enable_offline_mode = true` ensures zero socket operations occur.

---

### Q5: How can I achieve $< 1\,\mu\text{s}$ latency on CPU execution?
To achieve sub-microsecond latency on CPUs (such as Intel Xeon or Core Ultra):
1. Use models with small parameter footprints (e.g., 32-dim tabular autoencoders).
2. Compile with AVX-512 enabled (`-march=native`).
3. Isolate the execution CPU core using the Linux kernel boot parameter `isolcpus=<core_id>`.
4. Lock CPU core frequency to maximum using `cpupower frequency-set -g performance`.
5. Pre-warm CPU caches with at least $1{,}000$ discard passes.

