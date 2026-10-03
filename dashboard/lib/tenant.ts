"use client";

/** Tenant context switcher (Service 3: MSSP portal).

Persists the selected tenant in localStorage and surfaces it as the
X-Tenant-ID header on tenant-scoped backend calls. JWT auth still
applies; the header selects which organization the call addresses.
*/

const KEY = "aryorithm_tenant_id";

export function getSelectedTenant(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setSelectedTenant(tenantId: string | null): void {
  try {
    if (tenantId) localStorage.setItem(KEY, tenantId);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — header simply omitted */
  }
}
