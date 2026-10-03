# Plugin Architecture

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Dynamic linker mechanics: dlopen with RTLD_LAZY | RTLD_LOCAL.

## Isolation model

Each plugin lives in its own link namespace; conflicting dependencies coexist with the host.

## Trust model

Plugins run in-process; only signed, version-pinned plugins load in production.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
