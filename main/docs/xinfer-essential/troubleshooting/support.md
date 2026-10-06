# Enterprise Support & Issue Reporting

---

## 1. Reporting Bugs & Technical Inquiries

When reporting a runtime issue or suspected regression on GitHub, include output from the automated diagnostics tool along with your environment details:

```bash
# Generate comprehensive hardware diagnostics
xinfer-diag --verbose > xinfer_diag.log

# Capture kernel environment
uname -a >> xinfer_diag.log
dmesg | tail -n 100 >> xinfer_diag.log
```

Open an issue on GitHub:
👉 **[https://github.com/kamisaberi/xinfer-essential/issues](https://github.com/kamisaberi/xinfer-essential/issues)**

---

## 2. Enterprise Support SLAs

Aryorithm Technologies B.V. provides commercial support for mission-critical industrial and defense deployments:

| Support Tier | Target SLA | Coverage | Scope |
| :--- | :--- | :--- | :--- |
| **Community Support** | Best Effort | Public GitHub Issues | Bug reports, public docs. |
| **Enterprise Standard**| 8 Business Hours | Private Help Desk | Integration reviews, performance audits. |
| **Mission-Critical Defense**| **1 Hour (24/7/365)** | Dedicated Systems Architect | On-site triage, kernel driver engineering, custom silicon BSP porting. |

For enterprise support contracts and air-gapped security certification inquiries:
* **Email:** `support@aryorithm.com`
* **Website:** `https://aryorithm.com`

---

## 3. Security Vulnerability Disclosure Policy

If you discover a security vulnerability or potential memory safety issue in `xinfer-essential`, do not open a public issue.

Send an encrypted report to **`security@aryorithm.com`**. We acknowledge disclosures within **48 hours** and provide CVE assignment, risk remediation, and backported security patches according to coordinated disclosure guidelines.
```

---

## Master Status: Project 1 Documentation Complete

The documentation suite for **Project 1 of 8: `xinfer-essential` (`libxinfer.so`)** is fully generated:

```text
xinfer-essential/docs/
├── mkdocs.yml                                 # [Delivered Part 1]
├── index.md                                   # [Delivered Part 1]
├── getting-started/ (6 files)                 # [Delivered Part 1]
├── architecture/ (5 files)                    # [Delivered Part 2]
├── silicon-backends/ (16 files)               # [Delivered Parts 3, 4, 5]
├── memory-management/ (5 files)               # [Delivered Part 6]
├── plugin-development/ (4 files)              # [Delivered Part 7]
│   └── standard-plugins/ (9 files)            # [Delivered Part 8]
├── model-hub/ (5 files)                       # [Delivered Part 9]
├── api-reference/ (8 files)                   # [Delivered Part 10]
├── tutorials/ (5 files)                       # [Delivered Part 11]
├── benchmarking/ (5 files)                    # [Delivered Part 12]
└── troubleshooting/ (6 files)                 # [Delivered Part 13]
```

Total: **70 documentation and configuration files**, providing full technical coverage of the Tier 1 inference engine.

---

### Ready for Next Project

When you are ready, confirm to transition to **Project 2 of 8**:  
👉 **`blackbox-essential` (`libblackbox.so`)** — *Tier 2 Active Mitigation Core (Linux eBPF/XDP Kernel Filter, SPMC Event Ring Buffer, and TPM 2.0 Hardware Root of Trust).*