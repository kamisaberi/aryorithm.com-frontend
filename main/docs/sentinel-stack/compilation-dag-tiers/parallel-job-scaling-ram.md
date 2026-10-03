# Parallel Job Scaling & RAM

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Dynamic compiler thread capping (make -j2 vs. nproc) under low RAM.

## Rule

Under 4 GB the cap drops to -j2 against OOM kills.

## Override

Flag exists for operators who know their box.

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
