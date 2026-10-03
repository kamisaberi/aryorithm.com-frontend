# Backend Initialization Failures

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Resolving driver issues: /dev/rknpu, CUDA init, NPU busy states.

## No device

Backend reports absent, not broken: check device nodes, driver modules, and container device mounts.

## Busy NPU

Another process holds the accelerator; use the exclusive-lock flag or stop the competing service.

```bash
$ ls -l /dev/rknpu* /dev/dri 2>/dev/null
$ nvidia-smi  # CUDA side
$ xinfer-selftest --probe-only
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
