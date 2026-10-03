# AES Weight Decryption

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Security: hardware-decrypted weight unbundler executed at boot.

## Flow

TPM-unwrapped key decrypts AES-256-GCM weight bundles into locked memory.

## Verification

GCM tags authenticate every chunk before the graph loads.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
