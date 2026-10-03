# Symbol Isolation

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Dynamic linker boundary rules: -fvisibility=hidden and XINFER_API.

## Rule

Everything hidden by default; only XINFER_API-marked symbols export. Plugins can bundle conflicting third-party libraries safely.

## Checking

nm -D --defined-only libxinfer.so must show only xinfer::* entry points. CI enforces this.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
