# Automated Configuration & State Backup

To prepare for hardware replacements or disaster recovery, `sentinel-stack` provides an automated backup target that packages runtime manifests, PKI certificates, and state journals into an encrypted tarball.

---

## 1. Creating a System Backup (`sudo make backup`)

Execute the backup target:

```bash
sudo make backup
```

### Archive Generated:
```text
/opt/sentinel-stack/backups/sentinel_backup_20261005_083500.tar.gz
```

### Packaged Items:
* `/etc/sentinel/` (Edge runtime YAML manifests and SSL certs).
* `/etc/sentinel-nexus/` (Hub YAML manifests, mTLS server keys, and client certs).
* `/var/lib/sentinel-nexus/data/nexus_state.json` (Fleet NodeRegistry state database).
* `/var/lib/sentinel-nexus/models/*.manifest.json` (Model verification checksums).

---

## 2. Disaster Recovery Restoration

To restore an appliance from a backup archive:

```bash
# 1. Re-install base stack on fresh server
sudo ./install.sh

# 2. Extract backup archive over root filesystem
sudo tar -xzf /path/to/sentinel_backup_*.tar.gz -C /

# 3. Reload services
sudo systemctl restart sentinel-nexus sentinel
```
