import { AdminNavGroup, StatCard, User, Subscription, ApiKey, Invoice, Activity } from "@/types/admin";

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Mission Control",
    items: [
      { label: "Overview", href: "/dashboard", icon: "◈" },
      { label: "MDR Triage Hub", href: "/dashboard/mdr-triage", icon: "◍", highlight: "orange" },
      { label: "Threat Map", href: "/threat-map", icon: "◉" },
      { label: "Live XAI Stream", href: "/xai-feed", icon: "◷" },
    ],
  },
  {
    label: "Edge Fleet",
    items: [
      { label: "Asset Topology", href: "/topology", icon: "⟁" },
      { label: "Appliance Matrix", href: "/fleet/appliances", icon: "▣", highlight: true },
      { label: "Site Enclaves", href: "/fleet/enclaves", icon: "◆", highlight: true },
      { label: "Fleet Nodes", href: "/fleet-nodes", icon: "❏" },
      { label: "Provisioning (ZTP)", href: "/provisioning", icon: "⚡" },
      { label: "Kernel eBPF Rules", href: "/kernel-rules", icon: "⌘" },
    ],
  },
  {
    label: "Threat Defense",
    items: [
      { label: "Collective Grid", href: "/threats/collective-grid", icon: "⇄", highlight: true },
      { label: "SCADA & OT Monitor", href: "/threats/scada-cps", icon: "◫", highlight: true },
      { label: "Ransomware Vault", href: "/threats/ransomware-clearinghouse", icon: "⛨", highlight: true },
      { label: "Threat Bus", href: "/threat-bus", icon: "≋" },
      { label: "MITRE ATT&CK", href: "/mitre", icon: "▦" },
      { label: "SCADA Monitor", href: "/scada", icon: "◨" },
      { label: "Identity & Bot Defense", href: "/identity", icon: "◉" },
      { label: "Identity & ITDR", href: "/threats/identity-itdr", icon: "◐", highlight: "red" },
      { label: "Bot Kinematics API", href: "/threats/bot-kinematics", icon: "〜", highlight: "red" },
      { label: "Zero Trust (ZTNA)", href: "/threats/ztna", icon: "◒", highlight: "red" },
    ],
  },
  {
    label: "Specialized CPS",
    items: [
      { label: "Medical & IoMT", href: "/threats/medical-pacs", icon: "✚", highlight: "red" },
      { label: "Maritime Fleet", href: "/fleet/maritime", icon: "⚓", highlight: "red" },
    ],
  },
  {
    label: "AI & Silicon",
    items: [
      { label: "Model Repository", href: "/model-hub", icon: "⬡" },
      { label: "Cloud Model Forge", href: "/cloud-forge", icon: "▲" },
      { label: "Silicon Compiler", href: "/ai/silicon-compiler", icon: "⟨⟩", highlight: "green" },
      { label: "AI TRiSM Firewall", href: "/ai/trism-firewall", icon: "⛨", highlight: "green" },
    ],
  },
  {
    label: "Compliance GRC",
    items: [
      { label: "EU NIS2 & DORA", href: "/compliance/nis2-dora", icon: "✓", highlight: "green" },
      { label: "IEC 62443 Industrial", href: "/compliance/iec-62443", icon: "⛨" },
      { label: "CMMC 2.0 / NIST", href: "/compliance/cmmc-nist", icon: "▤", highlight: "green" },
      { label: "Insurance Verifier", href: "/compliance/insurance", icon: "◈", highlight: "green" },
      { label: "SBOM Tracker", href: "/compliance/sbom", icon: "≣" },
    ],
  },
  {
    label: "Digital Forensics",
    items: [
      { label: "Evidence PCAP Vault", href: "/forensics/evidence", icon: "◎" },
      { label: "CDR Sanitizer (classic)", href: "/forensics/cdr", icon: "⌫" },
      { label: "Firmware Analyzer (classic)", href: "/forensics/firmware", icon: "◍" },
      { label: "CDR Sanitizer", href: "/dfir/cdr-sanitizer", icon: "⬣", highlight: "red" },
      { label: "Firmware Analyzer", href: "/dfir/firmware-analyzer", icon: "⬔", highlight: "red" },
    ],
  },
  {
    label: "Cyber Range",
    items: [
      { label: "Digital Twins", href: "/range/digital-twins", icon: "⬣", highlight: "orange" },
      { label: "Resilience Bench", href: "/range/resilience-bench", icon: "⬔", highlight: "orange" },
      { label: "Twins (classic)", href: "/cyber-range/twins", icon: "⧉" },
      { label: "Attack Replay", href: "/cyber-range/replay", icon: "↻" },
      { label: "Resilience (classic)", href: "/cyber-range/resilience", icon: "⬢" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Access Control (RBAC)", href: "/users", icon: "◉" },
      { label: "API Keys & Webhooks", href: "/api-keys", icon: "⚿" },
      { label: "Licensing & Billing", href: "/billing", icon: "▣" },
      { label: "Emergency SLA & Triage", href: "/settings/emergency-sla", icon: "⚠", highlight: "orange" },
      { label: "Audit Trail", href: "/activity", icon: "◷" },
      { label: "System", href: "/settings", icon: "⚙" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Subscriptions", href: "/subscriptions", icon: "◆", badge: "42" },
      { label: "Licenses", href: "/licenses", icon: "✦" },
    ],
  },
];

export const STATS: StatCard[] = [
  { label: "Total Revenue", value: "$48,290", change: "+12.5%", trend: "up", icon: "▣" },
  { label: "Active Users", value: "1,284", change: "+8.2%", trend: "up", icon: "◉" },
  { label: "API Requests", value: "2.4M", change: "+23.1%", trend: "up", icon: "⚿" },
  { label: "Churn Rate", value: "1.8%", change: "-0.4%", trend: "down", icon: "↘" },
];

export const USERS: User[] = [
  { id: "usr_001", name: "Sara Ahmadi", email: "sara@aryorithm.com", role: "admin", status: "active", plan: "Enterprise", joined: "2024-01-15", lastActive: "2 min ago" },
  { id: "usr_002", name: "Farzin Mohammadi", email: "farzin@aryorithm.com", role: "admin", status: "active", plan: "Enterprise", joined: "2024-01-10", lastActive: "5 min ago" },
  { id: "usr_003", name: "Ali Rezaei", email: "ali@sentinel.io", role: "member", status: "active", plan: "Pro", joined: "2024-03-22", lastActive: "1 hour ago" },
  { id: "usr_004", name: "Maria Chen", email: "maria@blackbox.dev", role: "member", status: "active", plan: "Pro", joined: "2024-05-08", lastActive: "3 hours ago" },
  { id: "usr_005", name: "James Wilson", email: "james@nexus.corp", role: "viewer", status: "invited", plan: "Starter", joined: "2024-06-14", lastActive: "Never" },
  { id: "usr_006", name: "Priya Sharma", email: "priya@forge.ai", role: "member", status: "suspended", plan: "Pro", joined: "2024-02-28", lastActive: "2 days ago" },
  { id: "usr_007", name: "Omar Hassan", email: "omar@trust.net", role: "member", status: "active", plan: "Enterprise", joined: "2024-04-17", lastActive: "30 min ago" },
  { id: "usr_008", name: "Elena Volkov", email: "elena@xinfer.tech", role: "viewer", status: "active", plan: "Starter", joined: "2024-07-01", lastActive: "6 hours ago" },
];

export const SUBSCRIPTIONS: Subscription[] = [
  { id: "sub_001", customer: "Sentinel Corp", plan: "enterprise", status: "active", mrr: 4200, started: "2024-01-15", renews: "2025-01-15" },
  { id: "sub_002", customer: "Blackbox Systems", plan: "pro", status: "active", mrr: 490, started: "2024-03-22", renews: "2025-03-22" },
  { id: "sub_003", customer: "Nexus Industries", plan: "enterprise", status: "active", mrr: 3800, started: "2024-02-10", renews: "2025-02-10" },
  { id: "sub_004", customer: "Forge AI", plan: "pro", status: "trialing", mrr: 0, started: "2024-09-20", renews: "2024-10-20" },
  { id: "sub_005", customer: "TrustNet", plan: "enterprise", status: "past_due", mrr: 5100, started: "2024-04-05", renews: "2024-10-05" },
  { id: "sub_006", customer: "Xinfer Tech", plan: "starter", status: "active", mrr: 99, started: "2024-07-01", renews: "2024-10-01" },
  { id: "sub_007", customer: "DataMesh", plan: "pro", status: "canceled", mrr: 0, started: "2024-05-18", renews: "—" },
];

export const API_KEYS: ApiKey[] = [
  { id: "key_001", name: "Production API", prefix: "ary_live_9f2k...", created: "2024-01-15", lastUsed: "2 min ago", status: "active", requests: 1240000 },
  { id: "key_002", name: "Staging", prefix: "ary_test_3m8x...", created: "2024-03-22", lastUsed: "1 hour ago", status: "active", requests: 89000 },
  { id: "key_003", name: "Mobile SDK", prefix: "ary_live_7p4n...", created: "2024-05-08", lastUsed: "3 hours ago", status: "active", requests: 456000 },
  { id: "key_004", name: "Legacy Integration", prefix: "ary_live_2k9m...", created: "2023-11-10", lastUsed: "30 days ago", status: "revoked", requests: 2100000 },
  { id: "key_005", name: "Partner: Sentinel", prefix: "ary_live_5t7r...", created: "2024-06-01", lastUsed: "5 min ago", status: "active", requests: 780000 },
  { id: "key_006", name: "CI/CD Pipeline", prefix: "ary_test_8w3e...", created: "2024-07-15", lastUsed: "12 hours ago", status: "active", requests: 12000 },
];

export const INVOICES: Invoice[] = [
  { id: "inv_001", customer: "Sentinel Corp", amount: 4200, status: "paid", date: "2024-09-01", due: "2024-09-15" },
  { id: "inv_002", customer: "Blackbox Systems", amount: 490, status: "paid", date: "2024-09-01", due: "2024-09-15" },
  { id: "inv_003", customer: "Nexus Industries", amount: 3800, status: "open", date: "2024-09-15", due: "2024-09-30" },
  { id: "inv_004", customer: "TrustNet", amount: 5100, status: "overdue", date: "2024-08-05", due: "2024-08-20" },
  { id: "inv_005", customer: "Xinfer Tech", amount: 99, status: "paid", date: "2024-09-01", due: "2024-09-15" },
  { id: "inv_006", customer: "DataMesh", amount: 490, status: "void", date: "2024-08-18", due: "2024-09-02" },
];

export const ACTIVITIES: Activity[] = [
  { id: "act_001", actor: "Sara Ahmadi", action: "created API key", target: "Production API v2", time: "2 min ago", type: "api" },
  { id: "act_002", actor: "System", action: "subscription renewed", target: "Sentinel Corp — Enterprise", time: "15 min ago", type: "billing" },
  { id: "act_003", actor: "Farzin Mohammadi", action: "suspended user", target: "Priya Sharma", time: "1 hour ago", type: "security" },
  { id: "act_004", actor: "Omar Hassan", action: "upgraded plan", target: "Pro → Enterprise", time: "2 hours ago", type: "billing" },
  { id: "act_005", actor: "System", action: "invoice overdue", target: "TrustNet — $5,100", time: "3 hours ago", type: "billing" },
  { id: "act_006", actor: "Ali Rezaei", action: "joined team", target: "Sentinel Corp", time: "5 hours ago", type: "user" },
  { id: "act_007", actor: "System", action: "rate limit triggered", target: "Partner: Sentinel", time: "6 hours ago", type: "api" },
  { id: "act_008", actor: "Maria Chen", action: "updated billing info", target: "Blackbox Systems", time: "8 hours ago", type: "billing" },
  { id: "act_009", actor: "System", action: "backup completed", target: "database-snapshot-0928", time: "12 hours ago", type: "system" },
  { id: "act_010", actor: "Elena Volkov", action: "signed up", target: "Starter plan", time: "1 day ago", type: "user" },
];
