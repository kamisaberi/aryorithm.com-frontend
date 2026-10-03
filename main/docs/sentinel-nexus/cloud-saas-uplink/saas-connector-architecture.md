# SaaS Connector Architecture

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Decoupled C++ outbound HTTPS client (SaaSConnector.cpp).

## Direction

Outbound only; the cloud never dials in.

## Isolation

Connector faults cannot stall local enforcement.

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
