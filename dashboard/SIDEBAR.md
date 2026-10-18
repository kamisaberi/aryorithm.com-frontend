# Dashboard — Left Sidebar Navigation

Left-hand navigation of the admin dashboard (`localhost:3001` in dev,
`https://app.aryorithm.com` in production).

- **Source of truth:** the `ADMIN_NAV` array in [`data/admin.ts`](./data/admin.ts),
  rendered by [`components/layout/AdminSidebar.tsx`](./components/layout/AdminSidebar.tsx).
- **Items:** 49 across 10 groups, listed below in display order.
- **URLs:** app-relative paths (prefix with the dashboard origin to get the full address).
- **Active state:** an item is highlighted when the route equals its URL or starts with `URL + "/"`.

> Keep this file in sync when `ADMIN_NAV` changes.

## Mission Control

| Item | URL |
| --- | --- |
| Overview | `/dashboard` |
| MDR Triage Hub | `/dashboard/mdr-triage` |
| Threat Map | `/threat-map` |
| Live XAI Stream | `/xai-feed` |

## Edge Fleet

| Item | URL |
| --- | --- |
| Asset Topology | `/topology` |
| Appliance Matrix | `/fleet/appliances` |
| Site Enclaves | `/fleet/enclaves` |
| Fleet Nodes | `/fleet-nodes` |
| Provisioning (ZTP) | `/provisioning` |
| Kernel eBPF Rules | `/kernel-rules` |

## Threat Defense

| Item | URL |
| --- | --- |
| Collective Grid | `/threats/collective-grid` |
| SCADA & OT Monitor | `/threats/scada-cps` |
| Ransomware Vault | `/threats/ransomware-clearinghouse` |
| Threat Bus | `/threat-bus` |
| MITRE ATT&CK | `/mitre` |
| SCADA Monitor | `/scada` |
| Identity & Bot Defense | `/identity` |
| Identity & ITDR | `/threats/identity-itdr` |
| Bot Kinematics API | `/threats/bot-kinematics` |
| Zero Trust (ZTNA) | `/threats/ztna` |

## Specialized CPS

| Item | URL |
| --- | --- |
| Medical & IoMT | `/threats/medical-pacs` |
| Maritime Fleet | `/fleet/maritime` |

## AI & Silicon

| Item | URL |
| --- | --- |
| Model Repository | `/model-hub` |
| Cloud Model Forge | `/cloud-forge` |
| Silicon Compiler | `/ai/silicon-compiler` |
| AI TRiSM Firewall | `/ai/trism-firewall` |

## Compliance GRC

| Item | URL |
| --- | --- |
| EU NIS2 & DORA | `/compliance/nis2-dora` |
| IEC 62443 Industrial | `/compliance/iec-62443` |
| CMMC 2.0 / NIST | `/compliance/cmmc-nist` |
| Insurance Verifier | `/compliance/insurance` |
| SBOM Tracker | `/compliance/sbom` |

## Digital Forensics

| Item | URL |
| --- | --- |
| Evidence PCAP Vault | `/forensics/evidence` |
| CDR Sanitizer (classic) | `/forensics/cdr` |
| Firmware Analyzer (classic) | `/forensics/firmware` |
| CDR Sanitizer | `/dfir/cdr-sanitizer` |
| Firmware Analyzer | `/dfir/firmware-analyzer` |

## Cyber Range

| Item | URL |
| --- | --- |
| Digital Twins | `/range/digital-twins` |
| Resilience Bench | `/range/resilience-bench` |
| Twins (classic) | `/cyber-range/twins` |
| Attack Replay | `/cyber-range/replay` |
| Resilience (classic) | `/cyber-range/resilience` |

## Settings

| Item | URL |
| --- | --- |
| Access Control (RBAC) | `/users` |
| API Keys & Webhooks | `/api-keys` |
| Licensing & Billing | `/billing` |
| Emergency SLA & Triage | `/settings/emergency-sla` |
| Audit Trail | `/activity` |
| System | `/settings` |

## Management

| Item | URL |
| --- | --- |
| Subscriptions | `/subscriptions` |
| Licenses | `/licenses` |
