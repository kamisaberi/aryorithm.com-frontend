# Phase 2: Repository Synchronization (`02_clone_repositories.sh`)

Phase 2 locates the source trees for all six runtime tiers. It supports both developer local directory discovery (using `rsync`) and fresh shallow Git cloning.

---

## 1. Script Implementation (`scripts/02_clone_repositories.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="/opt/sentinel-stack/src"
mkdir -p "${SRC_DIR}"

TIER_REPOS=(
    "xinfer-essential:https://github.com/kamisaberi/xinfer.git:xinfer"
    "blackbox-essential:https://github.com/kamisaberi/blackbox.git:blackbox"
    "blackbox-sentinel:https://github.com/kamisaberi/blackbox-sentinel.git:sentinel"
    "xinfer-forge:https://github.com/kamisaberi/xinfer-forge.git:forge"
    "sentinel-lab:https://github.com/kamisaberi/sentinel-lab.git:lab"
    "sentinel-nexus:https://github.com/kamisaberi/sentinel-nexus.git:nexus"
)

echo "[Phase 2] Synchronizing source trees across all 6 tiers..."

SCRIPT_PARENT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for entry in "${TIER_REPOS[@]}"; do
    REPO_NAME=$(echo "$entry" | cut -d':' -f1)
    GIT_URL=$(echo "$entry" | cut -d':' -f2)
    DIR_ALIAS=$(echo "$entry" | cut -d':' -f3)
    TARGET_PATH="${SRC_DIR}/${DIR_ALIAS}"

    # Strategy A: Check for existing local sibling directory on build machine
    LOCAL_DEV_PATH="${SCRIPT_PARENT}/${REPO_NAME}"
    if [ -d "${LOCAL_DEV_PATH}" ]; then
        echo "[*] Local source tree found for ${REPO_NAME}. Synchronizing via rsync..."
        rsync -a --exclude="build" --exclude=".git" "${LOCAL_DEV_PATH}/" "${TARGET_PATH}/"
    elif [ ! -d "${TARGET_PATH}/.git" ]; then
        # Strategy B: Clone shallow repository from GitHub
        echo "[*] Cloning ${REPO_NAME} from GitHub..."
        git clone --depth 1 --recurse-submodules "${GIT_URL}" "${TARGET_PATH}"
    else
        echo "[+] ${REPO_NAME} source already present at ${TARGET_PATH}."
    fi
done

echo "[+] Phase 2 Complete: All source code trees synchronized."
```

---

## 2. Invariants Enforced

* **Submodule Population:** Ensures nested Git submodules (such as hardware header shims) are populated.
* **Developer Priority:** Local working copies take priority over remote clones, allowing developers to test local uncommitted changes instantly.

