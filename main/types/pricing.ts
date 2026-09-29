export interface PricingTier {
  id: string;
  n: string;
  name: string;
  audience: string;
  price: string;
  priceNote: string;
  color: string;
  featured?: boolean;
  features: string[];
  cta: string;
  ctaStyle: "solid" | "outline" | "ghost";
  ctaTo: string;
  ctaSection?: string;
}

export interface CloudRates {
  ingest: number;
  egress: number;
  retain: number;
  compute: number;
  node: number;
  siteOverhead: number;
}

export interface RoiModel {
  sites: number;
  gbPerDay: number;
  gbYear: number;
  ingest: number;
  egress: number;
  retain: number;
  compute: number;
  siteOverhead: number;
  cloudTotal: number;
  nodeLicence: number;
  aryTotal: number;
  savings: number;
  pct: number;
  fiveYear: number;
}
