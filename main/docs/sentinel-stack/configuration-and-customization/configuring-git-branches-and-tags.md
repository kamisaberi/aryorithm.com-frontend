# Pinning Production Releases: Git Branches & Semantic Tags

By default, `sentinel-stack` tracks the `main` branch across all component repositories. For regulated production deployments, pin each tier to immutable semantic release tags (e.g., `v1.0.0` or `v2.4.0`).

---

## 1. Pinning Releases in `configs/stack.yaml`

Update the `branch` field for each tier to a specific Git commit hash or signed tag:

```yaml
repositories:
  xinfer_essential:
    git_url: "https://github.com/kamisaberi/xinfer.git"
    branch: "tags/v1.0.0"

  blackbox_essential:
    git_url: "https://github.com/kamisaberi/blackbox.git"
    branch: "tags/v1.0.0"

  blackbox_sentinel:
    git_url: "https://github.com/kamisaberi/blackbox-sentinel.git"
    branch: "tags/v2.4.0"

  xinfer_forge:
    git_url: "https://github.com/kamisaberi/xinfer-forge.git"
    branch: "tags/v2.4.0"

  sentinel_lab:
    git_url: "https://github.com/kamisaberi/sentinel-lab.git"
    branch: "tags/v1.0.0"

  sentinel_nexus:
    git_url: "https://github.com/kamisaberi/sentinel-nexus.git"
    branch: "tags/v2.4.0"
```

---

## 2. Synchronization Invariant

When Phase 2 (`02_clone_repositories.sh`) runs, it detects tag specifications and checks out the exact referenced commit:

```bash
git checkout -q "${TAG_OR_BRANCH}"
```

This ensures that builds are reproducible across physical servers and virtual environments.

