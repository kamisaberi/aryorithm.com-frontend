# Data Types & Enums

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


DataType, Precision, BackendType, and MemoryType enumerations.

## DataType

FLOAT32, FLOAT16, INT8, UINT8 — matching ONNX tensor element types.

## BackendType

One enumerator per silicon backend plus CPU_FALLBACK.

## MemoryType

HOST, HOST_PINNED, DEVICE, DMA_BUF.

## Precision

FP32, FP16, INT8 — request; the backend negotiates the fastest exact option.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
