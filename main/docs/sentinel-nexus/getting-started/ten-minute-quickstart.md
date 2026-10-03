# Ten-Minute Quickstart

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Booting Nexus and connecting your first edge appliance.

## Boot

One config, one command, three ports listening.

## Connect

Point a sentinel at Nexus; watch the heartbeat land in the UI.

```bash
$ sudo systemctl enable --now sentinel-nexus
$ nexus-ctl fleet list   # first appliance appears
```

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
