# Core Engine Design

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Decoupled C++20 execution pipeline and engine state machine.

## Pipeline stages

Resolve → load → bind → infer → enforce. Each stage owns no heap memory on the hot path.

## State machine

UNLOADED → LOADED → ARMED → RUNNING, with FAULTED reachable from any state on driver errors.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
