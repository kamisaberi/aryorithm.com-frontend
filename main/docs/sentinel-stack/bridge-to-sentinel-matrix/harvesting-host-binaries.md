# Harvesting Host-Compiled Executables (`shared/bin/`)

Phase 3 of `sentinel-stack` automates harvesting compiled production binaries from `/usr/local/bin` directly into the `sentinel-matrix/shared/bin/` staging area.

---

## 1. Binary Harvesting Script (`scripts/harvest_binaries.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

MATRIX_DIR="/opt/sentinel-matrix"
DEST_BIN="${MATRIX_DIR}/shared/bin"

if [ ! -d "${MATRIX_DIR}" ]; then
    echo "[*] sentinel-matrix directory not found at ${MATRIX_DIR}. Skipping binary harvest."
    exit 0
fi

mkdir -p "${DEST_BIN}"
echo "[*] Harvesting host-compiled binaries into ${DEST_BIN}..."

# List of native executables required by the simulation mesh
TARGET_BINARIES=(
    "/usr/local/bin/sentinel-nexus"
    "/usr/local/bin/sentinel"
    "/usr/local/bin/nexus-ctl"
    "/usr/local/bin/sentinel_lab"
)

for bin_path in "${TARGET_BINARIES[@]}"; do
    if [ -f "$bin_path" ]; then
        cp -u "$bin_path" "${DEST_BIN}/"
        chmod +x "${DEST_BIN}/$(basename "$bin_path")"
        echo "  -> Harvested: $(basename "$bin_path")"
    else
        echo "[-] ERROR: Expected binary ${bin_path} not found!" >&2
        exit 1
    fi
done

echo "[+] Binary harvesting complete. All executables staged for containerization."
```

---

## 2. Docker Container Integration

In `sentinel-matrix/docker/Dockerfile.node`, the harvested executable is mapped directly to the container entrypoint:

```dockerfile
# Uses the host-compiled binary directly
COPY shared/bin/sentinel /usr/local/bin/sentinel
RUN chmod +x /usr/local/bin/sentinel
ENTRYPOINT ["/usr/local/bin/sentinel"]
```

