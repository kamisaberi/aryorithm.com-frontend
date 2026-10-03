# ModelHub Architecture

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Dynamic resolution pipeline: memory, then local cache, then HTTPS.

## Order

Resident graph → verified local file → signed HTTPS fetch. First hit wins.

## Hot-load

Fetched models compile in the background and swap atomically.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
