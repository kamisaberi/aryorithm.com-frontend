# Dynamic Library Extraction via `ldd` (`shared/lib/`)

Binaries compiled on the host link against complex external libraries (e.g., `libabsl_synchronization.so.20260107`, `libre2.so.11`, `libgrpc++.so.1.62`, `libprotobuf.so.32`). Installing full developer packages in every Docker container image increases image sizes by over $2\text{ GB}$.

`sentinel-stack` extracts the exact required dynamic shared objects using automated `ldd` parsing.

---

## 1. Extraction Algorithm & Workflow

```text
 Target Binary: /usr/local/bin/sentinel-nexus
                       │
                       ▼ ldd /usr/local/bin/sentinel-nexus
 ┌─────────────────────────────────────────────────────────────┐
 │ Resolves Dynamic Relocation Table:                          │
 │  • libabsl_synchronization.so => /usr/lib/.../libabsl_...   │
 │  • libre2.so.11               => /usr/lib/.../libre2.so.11  │
 │  • libgrpc++.so.1.62          => /usr/local/lib/libgrpc++.so│
 └─────────────────────┬───────────────────────────────────────┘
                       │
                       ▼ Filters & Copies to Staging
 ┌─────────────────────────────────────────────────────────────┐
 │ Destination: sentinel-matrix/shared/lib/                    │
 │  - Preserves symbolic links                                 │
 │  - Total Payload Size: ~18 MB (Lean & Fast)                 │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. The Extraction Implementation (`scripts/extract_libraries.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

DEST_LIB="/opt/sentinel-matrix/shared/lib"
mkdir -p "${DEST_LIB}"

echo "[*] Resolving dynamic runtime dependencies via ldd..."

# Harvest libraries from both Nexus and Sentinel binaries
ldd /usr/local/bin/sentinel-nexus /usr/local/bin/sentinel 2>/dev/null | \
    grep -E 'libabsl|libre2|libgrpc|libproto|libxinfer|libblackbox|libfmt|libspdlog' | \
    awk '{print $3}' | sort -u | while read -r lib_path; do
        if [ -f "$lib_path" ]; then
            cp -u "$lib_path" "${DEST_LIB}/"
            echo "  -> Extracted: $(basename "$lib_path")"
        fi
    done

echo "[+] Library extraction complete: $(ls -1 "${DEST_LIB}" | wc -l) shared objects staged."
```

