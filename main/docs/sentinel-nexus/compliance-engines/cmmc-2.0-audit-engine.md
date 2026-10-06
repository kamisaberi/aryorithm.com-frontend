# CMMC 2.0 & NIST SP 800-171 Fleet Audit Engine

For defense prime contractors and defense industrial base (DIB) suppliers, `sentinel-nexus` includes an automated **Governance, Risk, and Compliance (GRC) Audit Engine** (`src/compliance/CmmcAuditEngine.cpp`). It collects hardware attestation quotes, mTLS session parameters, and kernel mitigation records across all 5,000 edge appliances to generate evidentiary audit packs for C3PAO assessors.

---

## 1. Traceability to CMMC 2.0 Level 2 Controls

| CMMC Practice ID | NIST SP 800-171 Requirement | `sentinel-nexus` Compliance Proof |
| :--- | :--- | :--- |
| **AC.L2-3.1.1** | **Authorized Access Control:** Limit system access to authorized devices and processes. | Enforces mutual TLS 1.3 on port 50051; rejects appliances that cannot provide an authentic **physical TPM 2.0 Endorsement Key (EK)** certificate. |
| **IA.L2-3.5.1** | **Identification & Authentication:** Authenticate devices before establishing network connections. | Periodically challenges nodes with 32-byte nonces; validates digital signatures over **PCR 0 (UEFI) and PCR 4 (Kernel)** before issuing 24-hour lease tokens. |
| **SI.L2-3.14.1** | **Flaw Remediation:** Identify, report, and correct system flaws in a timely manner. | Evaluates network telemetry in $< 0.84\,\mu\text{s}$ at edge boundaries; broadcasts zero-day IoC immunity fleet-wide in **$< 50\,\text{milliseconds}$**. |
| **SC.L2-3.13.1** | **Boundary Protection:** Protect communications at organizational boundaries. | Centrally manages and audits in-kernel eBPF packet filters across all physical network ingress points. |

---

## 2. Generating the C3PAO Assessment Bundle

Generate an aggregated compliance package via CLI:

```bash
nexus-ctl report cmmc --output /var/lib/sentinel-nexus/data/cmmc_audit_evidence.json
```

### Evidentiary JSON Excerpt:
```json
{
  "compliance_framework": "CMMC 2.0 Level 2 (NIST SP 800-171 Rev 2)",
  "evaluated_at_iso": "2026-10-05T08:00:00Z",
  "total_managed_nodes": 4992,
  "controls": {
    "AC.L2-3.1.1": {
      "status": "PASS",
      "proof": "100% of connected nodes authenticated via mTLS with discrete TPM 2.0 silicon."
    },
    "IA.L2-3.5.1": {
      "status": "PASS",
      "proof": "All 4,992 appliances successfully verified golden PCR 0 and PCR 4 baselines."
    },
    "SI.L2-3.14.1": {
      "status": "PASS",
      "proof": "Sub-microsecond active mitigation verified; fleet median p50 latency is 0.82 µs."
    }
  }
}
```

