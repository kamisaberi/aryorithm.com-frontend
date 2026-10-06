# Forge Trigger Automation & Subprocess Handshake

Once `DatasetCurator` writes a completed batch to `/var/lib/sentinel-nexus/forge_datasets/`, `sentinel-nexus` automatically alerts the `xinfer-forge` continual adaptation daemon.

---

## 1. Trigger Coordination Mechanisms

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ DatasetCurator.cpp finishes writing batch                   │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼ Primary Trigger                               ▼ Fallback Trigger
 ┌─────────────────────────────┐         ┌─────────────────────────────┐
 │ Inotify Kernel Event        │         │ Local IPC Socket / REST Hook│
 │ forge-cli auto-cycle traps  │         │ Calls: POST /api/v1/trigger │
 │ IN_CLOSE_WRITE event        │         │ on http://127.0.0.1:9445    │
 └──────────────┬──────────────┘         └──────────────┬──────────────┘
                │                                       │
                └───────────────────┬───────────────────┘
                                    │
                                    ▼
 [ xinfer-forge launches TabularMAE Training & Safety Audit Loop ]
```

---

## 2. Inotify Kernel Trigger Configuration

The integration runs without IPC overhead:
1. `DatasetCurator` closes the file descriptor after writing `forge_dataset_<uuid>.csv`.
2. The Linux kernel emits an `IN_CLOSE_WRITE` inotify notification.
3. `xinfer-forge` receives the notification, verifies that `.manifest.json` exists, and locks the batch for training.

