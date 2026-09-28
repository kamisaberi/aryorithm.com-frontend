export interface TelemetryMetric {
  id: string;
  label: string;
  target: number;
  prefix?: string;
  suffix: string;
  decimals: number;
  color: string;
  note: string;
  tag: string;
  bar: number;
}

export interface EdgeNode {
  id: string;
  label: string;
  short: string;
  angle: number;
  proto: string;
  site: string;
  color: string;
}

export interface CliLine {
  t: string;
  c?: string;
  d: number;
}

export interface CliCommand {
  label: string;
  hint: string;
  lines: CliLine[];
}
