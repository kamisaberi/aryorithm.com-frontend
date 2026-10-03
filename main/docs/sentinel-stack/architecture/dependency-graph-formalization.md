# Dependency Graph Formalization

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Symbol resolution: why Tier N must precede Tier N+1.

## Symbols

Each tier exports headers and .so symbols the next tier links.

## Violation

Out-of-order builds fail at link time with named missing symbols.

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
