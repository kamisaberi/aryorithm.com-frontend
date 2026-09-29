export const PGP_FINGERPRINT = "9E42 81BC D34A 7F60 2B18 90C4 EE12 3409 A1F8 6100";

export const PGP_KEY_BLOCK = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Comment: Aryorithm Technologies Master Security Key
Comment: 9E42 81BC D34A 7F60 2B18 90C4 EE12 3409 A1F8 6100
Comment: ED25519 / 4096-bit RSA  ·  security@aryorithm.com

mDMEZfQ8LhYJKwYBBAHaRw8BAQdAq1t7Yk9xP2mWc4vJ8dHnR0sTzXbA6uFgKpEm
3nQwRs60KUFyeW9yaXRobSBUZWNobm9sb2dpZXMgPHNlY3VyaXR5QGFyeW9yaXRo
bS5jb20+iJkEExYKAD0WIQSeQoG800p/YCsYkMTuEjQJofhhAAUCZfQ8LgIbAwUJ
A8JnAAULCQgHAgYVCgkICwIEFgIDAQIeAQIXgAAKCRDuEjQJofhhAP0VAP9mK2xQ
r7nT4cVbYpJd8sHwNfGzA3uEmR0kLpXvQ9tBcgEA1jZoXsPqR4vNmKdT8yWbH3nF
LgAtCuE6kYpRz0xQwAO4OARl9DwuEgorBgEEAZdVAQUBAQdAT8mWqZxKp3vNdRyH
2sGbF0nEjQ7uXkAmLpRzT9wBcyMDAQgHiHgEGBYKACAWIQSeQoG800p/YCsYkMTu
EjQJofhhAAUCZfQ8LgIbDAAKCRDuEjQJofhhAKzSAP9xN3mWqK8dRvTbYpJc7sHz
NgF0A2uEmR9kLpXwQ8tBcQD/UjZnXtPrR5vMmLdS9yVaG4nGMhAsCvF7kXqSy1yR
xQE=
=7Kq4
-----END PGP PUBLIC KEY BLOCK-----`;

export interface ThroughputOption {
  id: string;
  eps: number;
  note: string;
}

export const THROUGHPUTS: ThroughputOption[] = [
  { id: "1GbE", eps: 62000, note: "Branch site / small plant" },
  { id: "10GbE", eps: 620000, note: "Substation / hospital core" },
  { id: "40GbE", eps: 1250000, note: "Enterprise enclave aggregation" },
  { id: "100GbE", eps: 1250000, note: "Datacentre spine — requires 2× S-5000" },
];

export interface BackendOption {
  id: string;
  fits: string[];
}

export const BACKENDS: BackendOption[] = [
  { id: "Intel OpenVINO", fits: ["S-1000", "S-5000", "V-Edge"] },
  { id: "NVIDIA TensorRT", fits: ["S-5000"] },
  { id: "Rockchip RKNN", fits: ["S-1000"] },
  { id: "Hailo HailoRT", fits: ["S-1000", "S-5000"] },
  { id: "AMD Ryzen AI", fits: ["S-5000", "V-Edge"] },
  { id: "CPU AVX-512 only", fits: ["S-5000", "V-Edge"] },
];

export interface ThermalOption {
  id: string;
  model: string;
}

export const THERMALS: ThermalOption[] = [
  { id: "DIN-Rail (−40 °C to +85 °C, fanless)", model: "S-1000" },
  { id: "1U Server (climate-controlled rack)", model: "S-5000" },
  { id: "Virtualised (hypervisor estate)", model: "V-Edge" },
];

export const ENTERPRISE_ENVS = [
  "Industrial OT (SCADA / PLC)",
  "Electrical Substation (IEC 61850)",
  "Medical / Clinical (DICOM / HL7)",
  "Maritime / Naval Platform",
  "Enterprise IT Enclave",
  "Mixed IT + OT Estate",
];

export const ENTERPRISE_FORMS = [
  "Model S-5000 (1U Rackmount)",
  "Model S-1000 (DIN-Rail)",
  "Model V-Edge (Virtual Appliance)",
  "Recommend for me",
];

export const DEFENSE_CLEARANCES = [
  "Unclassified",
  "Confidential",
  "Secret",
  "Top Secret",
  "TS/SCI",
  "NATO Secret",
  "National equivalent",
];

export const DEFENSE_FACILITIES = [
  "Non-SCIF commercial facility",
  "Controlled access area",
  "Accredited SCIF",
  "Air-gapped enclave",
  "Deployed / expeditionary",
];

export const DEFENSE_CLASSIFICATIONS = [
  "Unclassified / CUI",
  "Confidential",
  "Secret",
  "Above Secret — discuss offline",
];

export const DISCLOSURE_STEPS = [
  "Encrypt your report to the fingerprint above and mail security@aryorithm.com.",
  "We acknowledge within 72 hours with a tracking reference.",
  "Coordinated disclosure window is 90 days by default, extended only by mutual agreement.",
  "Verified findings are credited in the release advisory unless you request anonymity.",
];
