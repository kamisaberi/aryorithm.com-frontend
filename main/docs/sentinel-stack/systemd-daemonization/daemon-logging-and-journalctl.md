# Daemon Logging & journalctl

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Centralized logging, journalctl filtering, and log rotation.

## Filter

Per-unit, per-priority queries documented with examples.

## Rotate

Size-capped journals; compliance logs ship separately.

```bash
$ journalctl -u sentinel-nexus -p warning --since -1h
$ journalctl -u blackbox-sentinel -f
```

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
