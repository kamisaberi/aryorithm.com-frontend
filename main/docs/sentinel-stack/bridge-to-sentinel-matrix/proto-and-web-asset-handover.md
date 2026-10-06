# Protobuf Schemas & Web Asset Handover

In addition to compiled binaries, `sentinel-matrix` requires access to the latest Protocol Buffer specifications (`.proto`) and the embedded Single-Page Application (SPA) web assets.

---

## 1. Synchronized Asset Inventory

```text
 Source Repository: sentinel-nexus/
 ├── proto/sentinel_nexus.proto   ──► sentinel-matrix/shared/proto/
 └── static/                       ──► sentinel-matrix/shared/web/
     ├── index.html
     ├── app.js
     └── fleet_topology.js
```

---

## 2. Synchronization Script (`scripts/sync_assets.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

SRC_NEXUS="/opt/sentinel-stack/src/nexus"
MATRIX_SHARED="/opt/sentinel-matrix/shared"

if [ -d "${SRC_NEXUS}" ] && [ -d "${MATRIX_SHARED}" ]; then
    echo "[*] Synchronizing Protocol Buffers and Web assets to matrix..."
    
    mkdir -p "${MATRIX_SHARED}/proto" "${MATRIX_SHARED}/web"

    # Copy protobuf definitions
    cp -u "${SRC_NEXUS}/proto/sentinel_nexus.proto" "${MATRIX_SHARED}/proto/"

    # Copy minified Web SPA assets
    cp -ru "${SRC_NEXUS}/static/"* "${MATRIX_SHARED}/web/"

    echo "[+] Web and protobuf assets synchronized successfully."
fi
```

