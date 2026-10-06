# 1-Click Quickstart: `sudo ./install.sh`

This guide walks you through executing the automated single-command installation of the entire 6-tier Aryorithm ecosystem.

---

## 1. Single Command Execution

Clone the repository and execute the installer:

```bash
git clone --recurse-submodules https://github.com/kamisaberi/sentinel-stack.git
cd sentinel-stack
sudo ./install.sh
```

---

## 2. What the Installer Executes Automatically

```text
 [00_check_system.sh]          Validates Ubuntu 24.04/26.04, kernel >= 5.15, mounts bpffs.
 [01_install_dependencies.sh]  Resolves Clang-16, LLVM, t64 packages, builds Python venv.
 [02_clone_repositories.sh]    Synchronizes tier repositories or verifies local source trees.
 [03_build_all_tiers.sh]       Topological DAG build:
                                -> Tier 1: xinfer-essential   (libxinfer.so)
                                -> Tier 2: blackbox-essential (libblackbox.so, xdp_filter.o)
                                -> Tier 3: blackbox-sentinel  (sentinel, 26 subsystems, 30 plugins)
                                -> Tier 4: xinfer-forge       (forge-cli in /opt/sentinel-stack/venv)
                                -> Tier 5: sentinel-lab       (sentinel_lab binary & testbed)
                                -> Tier 6: sentinel-nexus     (sentinel-nexus, nexus-ctl, Web SPA)
 [04_setup_systemd.sh]         Configures & enables sentinel-nexus.service & sentinel.service.
 [05_verify_installation.sh]   Executes automated smoke tests across all 6 tiers.
```

---

## 3. Total Compilation Time

On an 8-core host with 16 GB of RAM, the complete end-to-end installation finishes in **under 8 minutes**:

```text
================================================================================
           SENTINEL-STACK 1-CLICK INSTALLATION COMPLETE!
================================================================================
Duration               : 7 minutes, 42 seconds
All 6 Tiers Installed  : /usr/local/lib and /usr/local/bin
Systemd Daemons Active : sentinel-nexus.service, sentinel.service
Web Command Center     : https://localhost:9443
================================================================================
```

