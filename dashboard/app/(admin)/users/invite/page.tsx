"use client";

import { type FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { User } from "@/types/admin";

const ROLE_OPTIONS: Array<User["role"]> = ["member", "viewer", "admin"];

export default function InviteUserPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("member");
  const [plan, setPlan] = useState("Starter");
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setInvited(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invite User"
        description="Send a workspace invitation with a role and plan."
        breadcrumbs={[
          { label: "Management" },
          { label: "Users", href: "/users" },
          { label: "Invite User" },
        ]}
        actions={<Button variant="secondary" href="/users">Back to Users</Button>}
      />

      {invited ? (
        <Card className="p-8 text-center">
          <Badge variant="kernel">Invitation ready</Badge>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">Invitation prepared for {name}.</h2>
          <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-muted">
            {email} will join as a {role} with the {plan} plan. Connect the account service to deliver the
            invitation email and activate the account.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button href="/users">Return to users</Button>
            <Button variant="secondary" onClick={() => setInvited(false)}>Invite another</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="invite-name" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Full name
              </label>
              <input
                id="invite-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Morgan"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="invite-email" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alex@company.com"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="invite-role" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as User["role"])}
                className="admin-input w-full"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="invite-plan" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Plan
              </label>
              <select
                id="invite-plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
                className="admin-input w-full"
              >
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            {error && <p className="sm:col-span-2 text-[12px] text-threat">{error}</p>}

            <div className="flex flex-wrap justify-end gap-3 border-t border-hairline pt-5 sm:col-span-2">
              <Button variant="secondary" href="/users">Cancel</Button>
              <Button type="submit">Send Invitation</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
