# NVIDIA TensorRT

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


CUDA streams, TensorRT .engine loading, FP16/INT8 execution on Jetson Orin, RTX, and datacenter GPUs.

## Artifacts

.engine / .onnx. Engines are cached per GPU architecture after first build.

## Transport

Unified memory and host-pinned buffers; zero staging copies into the CUDA graph.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
