# Aryorithm RBAC Report

Last reviewed: 2026-11-06

Source of truth:

- `app/models/user.py` — role enum and defaults
- `app/dependencies.py` — authentication and admin gates
- Router-level `Depends(...)` declarations
- `app/services/hub_access.py` — artifact permissions
- Dashboard / Hub / main frontend role helpers

---

## 1. Role inventory

The backend defines **5 roles**:

| Role | Intended meaning | Effective enforcement today |
|---|---|---|
| `super_admin` | Platform owner / Aryorithm Authority | Highest privileges; all admin features plus cross-tenant and appliance-specific powers |
| `tenant_admin` | Customer workspace administrator | Admin features, mostly scoped to their own tenant |
| `secops_analyst` | Security operations analyst | Standard authenticated user; no admin-only routes |
| `plant_operator` | Industrial plant operator | Same backend access as `secops_analyst` |
| `compliance_auditor` | Compliance / audit reviewer | Same backend access as `secops_analyst`; not read-only today |

There is also a legacy `"admin"` string accepted by several role checks, but it is **not a member of `UserRole`** and cannot be assigned through the current registration or installer flow.

> Summary: 5 declared roles, but effectively **3 enforced privilege levels**: `super_admin`, `tenant_admin`, and standard authenticated user. The last three roles currently share the same API permissions.

Default assignments:

- Self-service registration creates a `tenant_admin`.
- The installer creates/updates the initial user as `super_admin`.
- If a role is omitted when creating a user directly, the model default is `secops_analyst`.
- No backend API currently manages user roles or invitations.

---

## 2. Effective feature access

### Standard authenticated user

Includes `secops_analyst`, `plant_operator`, and `compliance_auditor`.

They can access nearly all tenant-scoped read pages and several operational write actions:

- Overview, threat map, XAI, SOC incidents, support SLA history
- Fleet topology, nodes, groups, enclaves, kernel rules
- Threat events, collective bus, MITRE, SCADA/CPS, ransomware data
- Threat broadcast and SOC messages
- Compliance reports and compliance PDF exports
- DFIR PCAP evidence, CDR file sanitization, firmware reports
- Cyber Range viewing, twin start/stop, attack replay, resilience score/bench
- CPS / identity / ZTNA read pages
- Licenses: list, detail, verify, activate, subscribe, portal download
- Audit logs
- Hub catalog and public artifacts
- Upload artifacts through dashboard/Hub, except official appliances
- Read the Scenario Graph Studio library and component palette
- Create/revoke their own Hub CLI publishing tokens
- Fork artifacts and manage sharing on artifacts they own

They **cannot** use admin-only write/configuration routes.

### Tenant Admin

`tenant_admin` gets all standard-user access **plus admin features within their tenant**:

- Fleet administration: restart/decommission nodes, create groups/enclaves, ZTP tokens, purge kernel rules
- AI/OTA: model upload, OTA stage/advance/rollback, Forge training, silicon compiler
- Visual Threat Blueprints: create, update, compile, deploy, delete
- Scenario Graph Studio: create, update, compile, bundle/publish, launch, delete
- Model Vault: upload artifact, safety verification, promotion
- DFIR: firmware dissection
- Cyber Range: create twins, provision/pause/resume/terminate instances, certify resilience
- Identity: revoke ITDR sessions
- Compliance: SBOM attestation
- Settings: API keys, webhooks, billing
- Emergency SLA dispatch
- Plan/pricing updates
- License revocation
- Tenant listing: own tenant only
- Tenant creation
- Artifact administration: visibility changes, sharing, share links, deletion for artifacts they own/administer
- Revoke other users' Hub CLI tokens

Tenant admins **cannot**:

- List all tenants
- Use global license scope: `GET /licenses?scope=all`
- Publish or delete official `.aryopack` appliances
- Automatically access another tenant's fleet/threat/compliance data

### Super Admin

`super_admin` gets all tenant-admin capabilities plus:

- List **all** tenants
- Global license views: `scope=all` across tenants
- Cross-tenant license verification/detail/revocation where supported
- Full artifact permissions across visibility scopes, including private artifacts
- Publish and delete official `.aryopack` appliance releases
- Delete/revoke authority-owned artifacts and appliances
- Revoke any Hub CLI token
- Access all artifact sharing/visibility controls

Important: `super_admin` is **not global on every module**. Many operational endpoints still filter by `user.tenant_id`, so this role does not automatically see every tenant's fleet, threats, DFIR, or range data.

---

## 3. Feature access matrix

| Feature area | Standard user* | Tenant Admin | Super Admin |
|---|---:|---:|---:|
| Overview, threat map, XAI, SOC, support history | Yes | Yes | Yes |
| Fleet read | Yes | Yes | Yes |
| Fleet writes / restart / decommission / ZTP / kernel purge | No | Yes | Yes |
| Threat read + broadcast | Yes | Yes | Yes |
| Blueprint read | Yes | Yes | Yes |
| Blueprint create / compile / deploy / delete | No | Yes | Yes |
| Scenario Graph Studio read / palette | Yes | Yes | Yes |
| Scenario Studio create / compile / bundle / launch / delete | No | Yes | Yes |
| AI model reads / OTA status | Yes | Yes | Yes |
| AI model upload / OTA writes / Forge / compiler | No | Yes | Yes |
| TRiSM evaluate | Yes | Yes | Yes |
| TRiSM policy update | No | Yes | Yes |
| Compliance reads + PDF export | Yes | Yes | Yes |
| SBOM attestation | No | Yes | Yes |
| DFIR PCAP / reports / CDR sanitize | Yes | Yes | Yes |
| DFIR firmware dissection | No | Yes | Yes |
| Cyber Range reads / twin start-stop / replay | Yes | Yes | Yes |
| Range provision / pause / resume / terminate / certify | No | Yes | Yes |
| CPS / ZTNA reads | Yes | Yes | Yes |
| ITDR session revocation | No | Yes | Yes |
| Settings API keys / webhooks / billing | No | Yes | Yes |
| Audit logs | Yes | Yes | Yes |
| License read / activate / verify | Yes | Yes | Yes |
| License revoke | No | Yes | Yes |
| Global license scope | No | No | Yes |
| Tenant list | No | Own tenant | All tenants |
| Tenant creation | No | Yes | Yes |
| Artifact upload | Yes | Yes | Yes |
| Appliance upload / delete | No | No | Yes |
| Artifact sharing / visibility / delete | Owner only | Admin on tenant artifacts | All artifacts |
| Hub CLI token creation | Yes | Yes | Yes |
| Hub artifact publishing, non-appliance | Yes | Yes | Yes |

`*` `secops_analyst`, `plant_operator`, and `compliance_auditor` are identical in current backend enforcement.

---

## 4. Frontend behavior

- The dashboard sidebar is **not role-filtered**. Non-admin users can open most pages; the backend then returns `403` for protected actions.
- Only `/settings` and `/settings/emergency-sla` are wrapped in the frontend `RequireAdmin` gate.
- Visual Threat Blueprints are readable by everyone, but edit controls are hidden unless the role is admin.
- Scenario Graph Studio library/palette reads are available to logged-in users; save, compile, bundle/publish, launch and delete controls are disabled unless the role is admin.
- Artifact upload disables appliance selection unless the user is `super_admin`.
- The Hub developer portal is available to any logged-in user; normal JWT sessions are treated as full developer identities for non-appliance publishing.
- Role badges on dashboard/Hub/main are display-only.

---

## 5. Important findings and gaps

1. **`plant_operator` and `compliance_auditor` are currently labels only.**
   There are no backend or frontend checks referencing them. A compliance auditor can perform the same writes as a SecOps analyst, including artifact uploads, threat broadcasts, range actions, and compliance exports.

2. **`admin` is a legacy mismatch.**
   `get_current_admin`, dashboard `isAdminRole`, and several artifact checks accept `"admin"`, but `UserRole` has no `ADMIN` member. Only `super_admin` and `tenant_admin` are assignable admin roles.

3. **There is no role-management API.**
   No endpoint exists for inviting users, changing roles, or listing tenant users. Registration always creates `tenant_admin`; the installer creates `super_admin`. Other roles currently require direct DB/seed manipulation.

4. **Publishing is broader than the role system suggests.**
   Any authenticated user can mint CLI tokens with requested scopes, and a plain JWT is treated as a full developer identity for non-appliance Hub publishing. If publishing should be limited to approved roles, that needs an explicit gate.

5. **Most read access is broad.**
   All five roles can read tenant-wide fleet, threat, compliance, DFIR, SOC, license, and range data. If `compliance_auditor` is meant to be read-only, or `plant_operator` is meant to be limited to plant operations, those restrictions are not implemented yet.

6. **Super admin is selectively global.**
   Cross-tenant access is implemented for tenants, licenses, and Hub artifacts, but not consistently across fleet/threat/compliance/range modules.

---

## 6. Recommended next steps

If these roles are meant to be distinct, implement explicit policy checks rather than relying on labels:

- Add a central permission map instead of ad-hoc role tuples.
- Add role gates for read-only roles such as `compliance_auditor`.
- Define `plant_operator` write scope explicitly.
- Remove or formalize the legacy `"admin"` alias.
- Add user/role management endpoints.
- Add tests for every role against high-risk routes.
- Decide whether CLI token minting and Hub publishing should be admin-only or open to all authenticated users.
