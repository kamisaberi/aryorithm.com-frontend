export interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

export interface AdminNavGroup {
  label: string;
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
