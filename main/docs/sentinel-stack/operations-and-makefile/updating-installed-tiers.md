# Updating Installed Tiers & Incremental Recompilation

When new commits or security patches are merged into any of the ecosystem repositories, `sentinel-stack` allows administrators to pull updates and perform incremental recompilations without reinstalling OS dependencies.

---

## 1. The Update Command (`sudo make update`)

Execute the automated update target:

```bash
cd /opt/sentinel-stack
sudo make update
```

---

## 2. What `make update` Executes Under the Hood

```text
 1. REPOSITORY SYNCHRONIZATION:
    Executes git pull --recurse-submodules across all 6 tiers in /opt/sentinel-stack/src/
                   │
                   ▼
 2. INCREMENTAL TOPOLOGICAL RECOMPILATION:
    Runs ninja across existing build/ directories:
    • Unchanged C++ compilation units (.o) are preserved (Near-Instant Build)
    • Modified source files and headers are recompiled
                   │
                   ▼
 3. DYNAMIC LINKER CACHE UPDATE:
    Executes ldconfig to refresh newly linked shared object exports
                   │
                   ▼
 4. IN-PROCESS SERVICE RELOAD:
    Dispatches SIGHUP to running daemons to reload models and configs without packet loss
```

---

## 3. Updating an Individual Tier

If you only modified code in a specific tier (e.g., `blackbox-sentinel`), rebuild that tier individually:

```bash
sudo ./scripts/03_build_all_tiers.sh --tier sentinel
```

