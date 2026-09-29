export const AUTH_METHODS = [
  { id: "auth-fido2", n: "01", label: "FIDO2 / WebAuthn", sub: "Hardware security key" },
  { id: "auth-tpm", n: "02", label: "TPM 2.0 Machine Certificate", sub: "mTLS device binding" },
  { id: "auth-saml", n: "03", label: "Enterprise SAML / SSO", sub: "Federated + hardware TOTP" },
];

export const MTLS_STEPS: [string, string][] = [
  ["ClientHello", "TLS 1.3 · X25519 key share offered"],
  ["ServerHello", "nexus-core-01 · cert chain presented"],
  ["Certificate Request", "mutual auth required · TPM-backed cert"],
  ["Client Certificate", "AK cert read from /dev/tpmrm0"],
  ["CertificateVerify", "signature produced inside the TPM"],
  ["PCR Quote", "PCR[0–7] matched to golden identity"],
  ["Finished", "channel established · operator session bound to hardware"],
];

export const EXAMPLE_TOKEN = "NODE-HW-9F2A-BC11-70C1";

export const LICENSE_STEPS = [
  "parsing hardware token · NODE-HW format OK",
  "resolving entitlement · Tier 2 Edge Appliance · 1 node",
  "binding licence to hardware fingerprint (non-transferable)",
  "signing envelope · ed25519 · key 9E4281BCD34A",
  "sealing expiry 2027-09-22 · offline grace 90 days",
];

export function buildLicenseEnvelope(token: string): string {
  const normalised = token.trim().toUpperCase();
  return `-----BEGIN ARYORITHM LICENSE ENVELOPE-----
version: 1
tier: edge-appliance
nodes: 1
hardware_binding: ${normalised}
issued: 2026-09-22T00:00:00Z
expires: 2027-09-22T00:00:00Z
offline_grace_days: 90
modules: all-26
plugins: all-30
signature_alg: ed25519
signing_key: 9E4281BCD34A7F602B18
signature: MEUCIQDq8fN2mWvK7cRbYpJd8sHwNfGzA3uEmR0kLpXvQ9tBcgIgHxN3
           mWqK8dRvTbYpJc7sHzNgF0A2uEmR9kLpXwQ8tBcQ=
digest: sha256:4c81e7a90b2f5d63718ae204c9b35f81e6d074ab29c5083fe1b46d2c9ab2
-----END ARYORITHM LICENSE ENVELOPE-----`;
}

export function isValidHardwareToken(t: string): boolean {
  return /^NODE-HW-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(t);
}
