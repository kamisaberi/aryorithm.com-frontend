# Linker & Symbol Conflicts

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Debugging dynamic library collisions and undefined symbols.

## Diagnose

LD_DEBUG=symbols plus nm -D --defined-only on both libraries; look for duplicate exported C++ symbols.

## Fix

Rebuild the plugin with -fvisibility=hidden; only XINFER_API symbols may export.

```bash
$ nm -D --defined-only libfoo.so | grep -v xinfer
$ LD_DEBUG=symbols ./app 2>&1 | grep -i conflict
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
