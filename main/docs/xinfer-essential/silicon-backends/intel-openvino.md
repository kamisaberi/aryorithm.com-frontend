# Intel OpenVINO

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Core Ultra NPU, Xeon CPU, and iGPU execution via direct ov::Tensor pointer passing.

## Artifacts

.xml + .bin / .onnx. IR caching makes warm starts instant.

## Transport

ov::Tensor wraps the caller buffer in place — the canonical zero-copy backend.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
