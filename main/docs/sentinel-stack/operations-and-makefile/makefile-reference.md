# Makefile Target Reference & Operations Cheat Sheet

The `sentinel-stack` root `Makefile` provides standardized targets for building, updating, monitoring, and maintaining the 6-tier runtime ecosystem.

---

## 1. Quick Target Summary (`make help`)

Run `make help` to inspect all registered maintenance targets:

```bash
make help
```

---

## 2. Command Cheat Sheet

### Deployment & Quality Gates
* **`sudo make all`** / **`sudo make install`**: Executes the master 6-phase installation pipeline (`sudo ./install.sh`).
* **`sudo make verify`**: Executes Phase 5 smoke tests (`scripts/05_verify_installation.sh`), asserting 11 quality gates across all 6 tiers.
* **`sudo make build-tier TIER=<tier_name>`**: Recompiles an individual tier (e.g., `make build-tier TIER=sentinel`).

### Maintenance & Operations
* **`sudo make status`**: Queries `systemd` daemon states, uptime, memory footprints, and open socket listeners.
* **`sudo make update`**: Fetches the latest Git commits across all tier repositories, executes incremental builds, and hot-reloads services.
* **`sudo make restart`**: Restarts `sentinel-nexus.service` and `sentinel.service` cleanly.
* **`sudo make backup`**: Archives all configuration files, PKI certificates, and `nexus_state.json` into a timestamped tarball.

### Cleanup & Uninstallation
* **`sudo make clean`**: Deletes temporary build directories (`build/`) across all source trees.
* **`sudo make uninstall`**: Halts systemd services, removes installed binaries, shared libraries, headers, and unlinks systemd units.

