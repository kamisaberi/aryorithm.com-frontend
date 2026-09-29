export interface ControlRef {
  id: string;
  title: string;
  parent: string;
  claim: string;
  detail: string;
  evidence: string;
  link: { to: string; section?: string };
}

export interface ComplianceFramework {
  id: string;
  short: string;
  name: string;
  authority: string;
  color: string;
  blurb: string;
  stats: [string, string][];
  controls: ControlRef[];
}

export interface SbomArtifact {
  id: string;
  name: string;
  version: string;
  kind: string;
  size: string;
  hash: string;
  shortHash: string;
  action: string;
  format: string;
  released: string;
}
