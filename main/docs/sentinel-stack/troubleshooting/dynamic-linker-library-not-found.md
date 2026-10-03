# Dynamic Linker: Library Not Found

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Fixing "cannot open shared object file" via ldconfig / ld.so.conf.

## Refresh

ldconfig after every library install — automated, but verify.

## Conf

Custom prefixes need ld.so.conf.d entries.

```bash
$ ldconfig -p | grep -E 'libxinfer|libblackbox'
$ sudo ldconfig   # when in doubt
```

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
