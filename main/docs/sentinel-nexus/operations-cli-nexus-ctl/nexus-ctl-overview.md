# nexus-ctl Overview

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


C++20 terminal admin tool syntax and flags.

## Shape

nexus-ctl <group> <action> [flags]; JSON output on demand.

## Auth

JWT login cached locally with refresh.

```bash
$ nexus-ctl auth login ops@example.com
$ nexus-ctl fleet list
$ nexus-ctl threat drop 198.51.100.45
```

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
