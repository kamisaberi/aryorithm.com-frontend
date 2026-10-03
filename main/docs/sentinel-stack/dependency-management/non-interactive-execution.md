# Non-Interactive Execution

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


DEBIAN_FRONTEND=noninteractive and Dpkg force-confdef options.

## Rule

No installer step may ever wait on stdin.

## Proof

CI runs with stdin closed to enforce it.

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
