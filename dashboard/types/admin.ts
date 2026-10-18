export interface AdminNavItem {
  /** Item title shown in the sidebar. */
  title: string;
  /** App-relative route, e.g. "/threats/grid". */
  url: string;
  /** Optional pill badge shown on the right, e.g. "LIVE" / "SPKG" / "14D". */
  badge?: string;
  /** Glyph rendered in the sidebar's icon column. */
  icon: string;
  /** Yellow (true), green ("green"), red ("red") or orange ("orange") accents. */
  highlight?: boolean | "green" | "red" | "orange";
}

export interface AdminNavGroup {
  /** Group heading, e.g. "Threat Defense". */
  group: string;
  items: AdminNavItem[];
}

export interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "suspended" | "invited";
  plan: string;
  joined: string;
  lastActive: string;
}

export interface Subscription {
  id: string;
  customer: string;
  plan: "starter" | "pro" | "enterprise";
  status: "active" | "past_due" | "canceled" | "trialing";
  mrr: number;
  started: string;
  renews: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
  status: "active" | "revoked";
  requests: number;
}

export interface Invoice {
  id: string;
  customer: string;
  amount: number;
  status: "paid" | "open" | "overdue" | "void";
  date: string;
  due: string;
}

export interface Activity {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  type: "user" | "billing" | "api" | "security" | "system";
}
