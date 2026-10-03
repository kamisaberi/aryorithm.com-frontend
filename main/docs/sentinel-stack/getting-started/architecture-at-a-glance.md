# Architecture at a Glance

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


High-level diagram: 6 tiers → shared libraries → systemd.

## Flow

Source trees become libraries, libraries become daemons, daemons become services.

## State

One state file tracks what is installed at which version.

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
