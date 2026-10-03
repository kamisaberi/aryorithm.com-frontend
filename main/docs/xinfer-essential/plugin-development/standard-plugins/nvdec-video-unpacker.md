# NVDEC Video Unpacker

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Vision: hardware-accelerated H.264/HEVC stream decoder into tensor surfaces.

## Throughput

Sustains 30 FPS 4K decode alongside inference on the same GPU.

## Zero-copy

Decoded surfaces map directly as input tensors; no host round-trip.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
