# Enterprise Support SLAs, Issue Escalation & Bug Reporting

---

## 1. Automated Diagnostic Bundle Generation

When reporting an issue with build failures, compiler crashes, or systemd daemonization, generate an automated diagnostic bundle:

```bash
sudo /opt/sentinel-stack/scripts/collect_diagnostics.sh --output /tmp/stack_diagnostics.tar.gz
```

This bundle packages:
* Host operating system details, kernel release, and hardware architecture (`uname -a`, `lscpu`).
* Complete installation log from `/var/log/sentinel_install.log`.
* Active dynamic linker cache configuration (`/etc/ld.so.conf.d/`).
* Output from `05_verify_installation.sh` quality gate smoke tests.
* Systemd service unit journals for `sentinel` and `sentinel-nexus`.

---

## 2. Commercial Support & Turn-Key Deployment SLAs

Aryorithm Technologies B.V. provides commercial engineering support for enterprise and defense deployments:

| Support Tier | Target Response Time | Availability | Scope |
| :--- | :--- | :--- | :--- |
| **Standard Commercial**| 8 Business Hours | Mon–Fri 08:00–18:00 CET | Build troubleshooting, dependency resolution. |
| **Mission-Critical Defense**| **1 Hour (24/7/365)** | Round-the-Clock | Dedicated systems architect, kernel-level triage, custom BSP porting, on-site deployment audits. |

For technical inquiries and enterprise SLA contracts:
* **Customer Portal:** `https://app.aryorithm.com/support`
* **Email:** `support@aryorithm.com`

---

## 3. Coordinated Security Vulnerability Disclosure

If you identify a security bypass, privilege escalation flaw, or memory corruption vulnerability in `sentinel-stack`:
* Send an encrypted PGP message to **`security@aryorithm.com`**.
* We acknowledge disclosures within **48 hours** and provide CVE assignment, risk remediation, and backported security patches according to coordinated disclosure guidelines.

