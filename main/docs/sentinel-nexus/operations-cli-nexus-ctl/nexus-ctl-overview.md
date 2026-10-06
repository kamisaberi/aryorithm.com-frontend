# `nexus-ctl` Terminal Administration Tool Overview

`nexus-ctl` is a native ISO C++20 command-line administration utility installed alongside `sentinel-nexus`. It provides systems engineers, SOC analysts, and automation pipelines with programmatic control over the fleet orchestrator, collective defense rules, model staging, and compliance reporting.

---

## 1. Global Syntax

```bash
nexus-ctl [GLOBAL OPTIONS] COMMAND [SUBCOMMAND] [ARGUMENTS...]
```

### Global Options

| Option Flag | Environment Variable | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `--nexus-url URL` | `NEXUS_API_URL` | `https://127.0.0.1:9443` | Sentinel-Nexus management endpoint. |
| `--token STRING` | `NEXUS_AUTH_TOKEN` | Read from session cache | Scoped Bearer JWT authentication token. |
| `--config PATH` | `NEXUS_CONFIG` | `~/.nexus/config.json` | Path to local credentials and preferences. |
| `--json` | `NEXUS_JSON_OUTPUT` | `false` | Emits machine-readable JSON output to stdout. |
| `--insecure` | N/A | `false` | Skips TLS certificate verification (Dev only). |
| `--help` | N/A | N/A | Displays help syntax and flags. |

---

## 2. Command Tree Summary

* **`nexus-ctl fleet`**: Node querying, health status, telemetry, and manual node eviction.
* **`nexus-ctl threat`**: In-kernel threat broadcasting (`drop`), global unblocking (`unblock`), and XAI querying.
* **`nexus-ctl ota`**: Canary model rollout inspection, artifact staging, phase advancement, and emergency rollback.
* **`nexus-ctl report`**: On-demand compliance scorecard compilation (CMMC Level 2, IEC 62443, EU NIS 2).
* **`nexus-ctl auth`**: Operator login, session token renewal, and credential caching.

---

## 3. Local Session Cache (`~/.nexus/session.json`)

When an administrator logs in via `nexus-ctl auth login`, the resulting Bearer JWT is cached securely with `0600` file permissions:

```json
{
  "nexus_url": "https://127.0.0.1:9443",
  "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at_epoch": 1791176400,
  "operator_email": "admin@substation.internal",
  "role": "FLEET_SECURITY_ADMIN"
}
```

