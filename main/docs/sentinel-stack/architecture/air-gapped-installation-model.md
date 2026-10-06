# Air-Gapped Installation & Offline Source Pre-Seeding

In classified defense installations and air-gapped industrial facilities, the target server has zero internet access to GitHub repositories or public Ubuntu package mirrors.

`sentinel-stack` supports an **Air-Gapped Pre-Seeded Deployment Mode**.

---

## 1. Offline Pre-Seeding Workflow

```text
 [ INTERNET-CONNECTED STAGING MACHINE ]
  1. Clones all 6 repositories with submodules:
     git clone --recurse-submodules https://github.com/kamisaberi/<repo>
  2. Downloads offline APT package cache (.deb bundle)
  3. Pre-downloads Python binary wheels for /opt/sentinel-stack/venv
  4. Archives into single portable bundle: sentinel-stack-airgapped.tar.gz
                       │
                       ▼ Transferred via Secure Physical Media (USB / Data Diode)
 [ AIR-GAPPED ON-PREMISES TARGET SERVER ]
  1. Decompresses archive to /opt/sentinel-stack/
  2. Executes: sudo ./install.sh --offline
```

---

## 2. The `--offline` Installer Mode

When executed with `--offline`:
* **Phase 1 (Dependencies):** Bypasses `apt-get update` and installs packages directly from a local `.deb` archive directory (`/opt/sentinel-stack/debs/*.deb`) using `dpkg -i`.
* **Phase 2 (Repositories):** Bypasses `git clone` and copies pre-seeded source trees directly from `/opt/sentinel-stack/src/` via `rsync`.
* **Phase 4 (Python Venv):** Installs PyTorch and ONNX wheels using pip's `--no-index --find-links=/opt/sentinel-stack/wheels/` flags.

