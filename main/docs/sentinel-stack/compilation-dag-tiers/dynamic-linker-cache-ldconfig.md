# Dynamic Linker Cache (ldconfig)

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Managing /etc/ld.so.cache updates after each tier build.

## Refresh

ldconfig runs after every library install, no exceptions.

## Verify

ldconfig -p greps confirm each soname before proceeding.

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
