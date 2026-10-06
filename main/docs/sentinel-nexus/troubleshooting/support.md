---

### File: `sentinel-nexus/docs/troubleshooting/support.md`

```markdown
# Enterprise Support SLAs & Incident Escalation

---

## 1. Automated Diagnostic Bundle Generation

When reporting an issue with fleet synchronization, gRPC connection drops, or model staging failures, generate an automated diagnostic bundle:

```bash
nexus-ctl diag --bundle --output /tmp/nexus_diagnostic_bundle.tar.gz
```

This bundle packages:
* `/etc/sentinel-nexus/nexus.yaml` (With credentials and keys automatically sanitized).
* Active systemd service journal logs (last 1,000 lines).
* Active in-memory fleet inventory snapshot from `data/nexus_state.json`.
* Thread pool metrics and open socket counts across ports 50051, 9443, and 9444.

---

## 2. Enterprise Commercial Support SLAs

Aryorithm Technologies B.V. provides commercial support for defense and critical infrastructure networks:

| Support Tier | Target Response Time | Availability | Scope |
| :--- | :--- | :--- | :--- |
| **Standard Support** | 8 Business Hours | Mon–Fri 08:00–18:00 CET | Configuration review, updates, bug patches. |
| **Mission-Critical Defense**| **1 Hour (24/7/365)** | Round-the-Clock | Dedicated systems architect, high-availability cluster design, custom protocol integration, on-site emergency support. |

For technical inquiries and enterprise SLA contracts:
* **Customer Portal:** `https://app.aryorithm.com/support`
* **Email:** `support@aryorithm.com`

---

## 3. Coordinated Security Vulnerability Disclosure

If you identify a potential security bypass, authentication flaw, or verifier escape in `sentinel-nexus`:
* Send an encrypted PGP message to **`security@aryorithm.com`**.
* We acknowledge disclosures within **48 hours** and provide CVE assignment, risk remediation, and backported security patches according to coordinated disclosure guidelines.
```

