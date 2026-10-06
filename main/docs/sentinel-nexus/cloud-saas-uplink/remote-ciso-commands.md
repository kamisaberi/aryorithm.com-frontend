# Remote CISO Administrative Commands (`GET /api/v1/commands/pending`)

For enterprise CISOs managing hundreds of remote facilities, the cloud portal (`app.aryorithm.com`) allows authorized administrators to issue high-priority operational commands that local Nexus instances retrieve during polling sweeps.

---

## 1. Command Execution Flow

```text
 Corporate CISO executes Emergency Canary Rollback on Web Dashboard
                              │
                              ▼ Queued in Cloud Backend: /commands/pending
 ┌─────────────────────────────────────────────────────────────┐
 │ Local SaaSConnector polls /commands/pending every 2 seconds │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼ Command Decrypted & Signature Verified
 ┌─────────────────────────────────────────────────────────────┐
 │ SaaSConnector::execute_remote_command()                     │
 ├─────────────────────────────────────────────────────────────┤
 │ • EMERGENCY_MODEL_ROLLBACK: Aborts active Canary fleet-wide │
 │ • GLOBAL_IP_PURGE         : Clears false-positive block rule│
 │ • FORENSIC_DUMP_TRIGGER   : Gathers signed PCAP bundle      │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼ Executed Locally in < 50ms
 [ Fleet state updated; completion receipt returned to Cloud ]
```

---

## 2. Cryptographic Command Signing

To prevent rogue server takeovers from compromising edge plants:
* All administrative commands dispatched by the cloud portal are **digitally signed with the corporate CISO’s offline administrative key**.
* `sentinel-nexus` validates the command signature against pre-enrolled public keys in `/etc/sentinel-nexus/certs/admin_authority.crt` before executing rollbacks or policy changes.

