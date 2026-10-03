# Port Binding & Socket Errors

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Fixing Address already in use on 50051, 9443, and 9444.

## Find

Identify squatters per port before killing anything.

## Fix

SO_REUSEADDR plus ordered startup in compose.

```bash
$ ss -ltnp | grep -E '50051|9443|9444'
$ sudo systemctl restart sentinel-nexus
```

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
