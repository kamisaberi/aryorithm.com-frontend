# Monitoring Daemons Status

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Inspecting running services with sudo make status.

## View

Unit states, uptimes, and recent errors in one screen.

## Alert

Non-zero states exit nonzero for monitors.

```bash
$ sudo make status
sentinel-nexus: active (42d) | blackbox-sentinel: active (42d)
```

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
