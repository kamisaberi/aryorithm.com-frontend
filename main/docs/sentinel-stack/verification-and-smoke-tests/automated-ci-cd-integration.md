# Automated Continuous Integration (CI/CD Pipeline)

`sentinel-stack` can be executed within GitHub Actions or GitLab CI runners to validate builds and dependency graphs on every commit.

---

## 1. GitHub Actions Workflow (`.github/workflows/stack_ci.yml`)

```yaml
name: Sentinel-Stack CI Quality Gate

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-verify:
    runs-on: ubuntu-24.04
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Execute Sentinel-Stack 1-Click Installer
        run: |
          sudo ./install.sh

      - name: Run Automated Post-Installation Smoke Tests
        run: |
          sudo make verify

      - name: Audit Dynamic Library Bundling
        run: |
          test -d /opt/sentinel-matrix/shared/lib && ls -lh /opt/sentinel-matrix/shared/lib
```

