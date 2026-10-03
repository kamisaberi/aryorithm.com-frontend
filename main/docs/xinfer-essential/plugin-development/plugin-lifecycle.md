# Plugin Lifecycle

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Registration, validation, execution, and teardown states.

## States

DISCOVERED → ABI-CHECKED → REGISTERED → ARMED → RETIRED. A failed ABI check quarantines the file, never the engine.

## Hot reload

Plugins unload and reload without restarting inference; in-flight tensors drain first.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
