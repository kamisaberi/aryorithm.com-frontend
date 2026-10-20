# Dashboard — Left Sidebar Navigation

Left-hand navigation of the admin dashboard (`localhost:3001` in dev,
`https://app.aryorithm.com` in production).

- **Source of truth:** the `ADMIN_NAV` array in [`data/admin.ts`](./data/admin.ts),
  rendered by [`components/layout/AdminSidebar.tsx`](./components/layout/AdminSidebar.tsx).
- **Items:** 20 across 6 groups, listed below in display order.
- **URLs:** app-relative paths (prefix with the dashboard origin to get the full address).
- **Badges:** optional pills rendered right of the item (LIVE / SPKG / 14D).
- **Active state:** an item is highlighted when the route equals its URL or starts with `URL + "/"`.

> Keep this file in sync when `ADMIN_NAV` changes.

## Mission Control

| Item | URL | Badge |
| --- | --- | --- |
| Overview | `/dashboard` | — |
| MDR Triage Hub | `/dashboard/mdr-triage` | LIVE |
| Threat Map & XAI | `/threat-map` | — |

## Edge Fleet

| Item | URL | Badge |
| --- | --- | --- |
| Appliance Matrix & Nodes | `/fleet/appliances` | — |
| Asset Topology & Enclaves | `/topology` | — |
| Kernel eBPF Engine | `/kernel-rules` | — |

## Threat Defense

| Item | URL | Badge |
| --- | --- | --- |
| Collective Grid & Bus | `/threats/grid` | — |
| SCADA & Specialized CPS | `/threats/scada-cps` | — |
| Identity, ZTNA & Bots | `/threats/identity-itdr` | — |
| MITRE ATT&CK & Ransomware | `/threats/mitre` | — |

## AI & Sentinel-Hub

| Item | URL | Badge |
| --- | --- | --- |
| Model Repository & Forge | `/model-hub` | — |
| Silicon Compiler & TRiSM | `/ai/silicon-compiler` | — |
| Visual Threat Blueprints | `/ai/threat-blueprints` | YAML |
| Sentinel-Hub Package Store | `/hub/store` | SPKG |

## Digital Forensics & Range

| Item | URL | Badge |
| --- | --- | --- |
| DFIR & Evidence Vault | `/forensics/evidence` | — |
| Digital Twins & Replay | `/range/digital-twins` | — |
| Sentinel-Lab Research Bench | `/range/lab-bench` | 14D |

## Compliance & Admin

| Item | URL | Badge |
| --- | --- | --- |
| Compliance & GRC Hub | `/compliance` | — |
| Billing & Subscriptions | `/billing` | — |
| RBAC, Audit & System | `/settings` | — |
