# Connecting Sentinel-Nexus to the Cloud SaaS Backend (`app.aryorithm.com`)

For enterprises using hybrid cloud management, this tutorial covers connecting an on-premises `sentinel-nexus` hub to the **Aryorithm Multi-Tenant Cloud Portal (`app.aryorithm.com`)** via the decoupled `SaaSConnector` client.

---

## 1. Cloud Credentials Acquisition

1. Log into your account on **`https://app.aryorithm.com`**.
2. Navigate to **Organization Settings $\to$ API Keys & Hub Provisioning**.
3. Generate a new Hub Enrollment Token and copy the `API_KEY` and `API_SECRET`.

---

## 2. Configuring `nexus.yaml`

Update `/etc/sentinel-nexus/nexus.yaml` with your cloud credentials:

```yaml
cloud_saas:
  enabled: true
  cloud_endpoint: "https://app.aryorithm.com"
  cloud_api_key: "ary_live_8f1c2a04d91242e1a084"
  cloud_api_secret: "sec_9e843c1294b13a7b41e2d901000000000000000000000000"
  nexus_id: "nexus-central-munich"
  sync_interval_seconds: 5
  enable_inbound_threat_feed: true
  enable_remote_ciso_commands: true
```

Restart `sentinel-nexus`:

```bash
sudo systemctl restart sentinel-nexus
```

---

## 3. Verifying Cloud Egress Synchronization

Monitor the service journal:

```bash
sudo journalctl -u sentinel-nexus -f | grep SaaSConnector
```

### Expected Output:
```text
[INFO] SaaSConnector: Authenticating with https://app.aryorithm.com...
[INFO] SaaSConnector: Authenticated successfully. Session token cached.
[INFO] SaaSConnector: 4-Tier Fleet Sync dispatched (4,992 Nodes, 14,800 Sensors). Status: 200 OK.
```

Log back into `app.aryorithm.com` to confirm that the full asset hierarchy and live telemetry are updating on your multi-tenant executive dashboard.
