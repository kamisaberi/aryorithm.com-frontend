# Topological Compilation DAG

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Mathematical dependency DAG across all six tiers.

## Order

xinfer → blackbox → sentinel → forge → lab → nexus; edges are link dependencies.

## Proof

The graph is acyclic by construction; cycles fail at lint time.

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
