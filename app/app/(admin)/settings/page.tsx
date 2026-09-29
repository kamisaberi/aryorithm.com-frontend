import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-[13px] text-muted">Platform configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* General */}
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">General</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Platform Name
              </label>
              <input type="text" defaultValue="Aryorithm SaaS" className="admin-input" />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Support Email
              </label>
              <input type="email" defaultValue="support@aryorithm.com" className="admin-input" />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Default Plan
              </label>
              <select className="admin-input">
                <option>Starter</option>
                <option>Pro</option>
                <option>Enterprise</option>
              </select>
            </div>
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">Security</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">Two-Factor Authentication</p>
                <p className="text-[11.5px] text-muted">Require 2FA for all admin users</p>
              </div>
              <button type="button" className="relative h-6 w-11 rounded-full bg-cyan/20 transition-colors" aria-label="Toggle 2FA">
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-cyan transition-transform" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">Session Timeout</p>
                <p className="text-[11.5px] text-muted">Auto-logout after inactivity</p>
              </div>
              <select className="admin-input w-32">
                <option>30 min</option>
                <option>1 hour</option>
                <option>4 hours</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">IP Allowlist</p>
                <p className="text-[11.5px] text-muted">Restrict access to specific IPs</p>
              </div>
              <Button variant="secondary" href="/settings/ip-allowlist">Configure</Button>
            </div>
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>

        {/* API */}
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">API Configuration</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Rate Limit (req/min)
              </label>
              <input type="number" defaultValue={1000} className="admin-input" />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Max API Keys per User
              </label>
              <input type="number" defaultValue={5} className="admin-input" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">API v2 Beta</p>
                <p className="text-[11.5px] text-muted">Enable v2 endpoints for testing</p>
              </div>
              <button type="button" className="relative h-6 w-11 rounded-full bg-hairline transition-colors" aria-label="Toggle API v2">
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-muted transition-transform" />
              </button>
            </div>
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">Notifications</h2>
          <div className="mt-4 space-y-4">
            {[
              { label: "New user signups", desc: "Get notified when a new user registers" },
              { label: "Failed payments", desc: "Alert on overdue or failed invoices" },
              { label: "API anomalies", desc: "Unusual API usage patterns" },
              { label: "Security alerts", desc: "Suspicious login attempts" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-ink">{item.label}</p>
                  <p className="text-[11.5px] text-muted">{item.desc}</p>
                </div>
                <button type="button" className="relative h-6 w-11 rounded-full bg-cyan/20 transition-colors" aria-label={`Toggle ${item.label}`}>
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-cyan transition-transform" />
                </button>
              </div>
            ))}
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
