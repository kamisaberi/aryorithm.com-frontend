export function formatCurrency(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatMicroseconds(us: number, decimals = 2): string {
  return `${us.toFixed(decimals)} µs`;
}

/** 10 GB -> "10 GB/day", 2000 GB -> "2.0 TB/day" */
export function formatVolumeLabel(gbPerDay: number): string {
  if (gbPerDay >= 1000) {
    const tb = gbPerDay / 1000;
    return `${tb.toFixed(gbPerDay % 1000 === 0 ? 0 : 1)} TB/day`;
  }
  return `${Math.round(gbPerDay)} GB/day`;
}

export function formatBytes(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} TB`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return `${Math.round(n)} B`;
}
