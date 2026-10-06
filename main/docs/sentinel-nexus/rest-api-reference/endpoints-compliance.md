# Compliance & Audit Endpoints (`/api/v1/reports/*`)

These endpoints generate on-demand compliance audit records and regulatory scorecards for industrial and defense audits.

---

## 1. Generate Master Compliance Scorecard: `GET /api/v1/reports/compliance`

Returns an aggregated evaluation across all supported regulatory frameworks.

### Query Parameters
* `format` (optional, string): `json` (default), `text`, or `pdf`.
* `tenant_id` (optional, string): Scope report to a specific organization.

### Request:
```bash
curl -k -H "Authorization: Bearer $TOKEN" \
    https://localhost:9443/api/v1/reports/compliance?format=json
```

### Response (`200 OK`):
```json
{
  "timestamp_iso": "2026-10-05T07:53:00Z",
  "managed_nodes": 4992,
  "standards": {
    "iec_62443_3_3": {
      "status": "COMPLIANT",
      "security_level": "SL 3 / SL 4",
      "fr3_system_integrity": "100%",
      "fr5_zone_segmentation": "100%",
      "fr7_resource_availability": "100%"
    },
    "cmmc_level_2": {
      "status": "COMPLIANT",
      "si_l2_3_14_1_flaw_remediation": "SUB_MICROSECOND_VERIFIED",
      "sc_l2_3_13_1_boundary_protection": "ACTIVE"
    },
    "eu_nis_2": {
      "status": "COMPLIANT",
      "article_21_incident_handling": "SUB_50MS_BROADCAST_ACTIVE",
      "cloud_egress_fees": "$0.00"
    }
  }
}
```

---

## 2. Dedicated Standard Routes

* `GET /api/v1/reports/cmmc`: Detailed NIST SP 800-171 control proofs.
* `GET /api/v1/reports/scada`: IEC 62443-3-3 industrial conduit proofs.

