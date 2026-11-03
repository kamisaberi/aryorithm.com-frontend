"use client";

import { type FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { USERS } from "@/data/admin";
import { User } from "@/types/admin";

const roleBadge = (role: User["role"]) => {
  const map = { admin: "cyan", member: "kernel", viewer: "muted" } as const;
  return <Badge variant={map[role]}>{role}</Badge>;
};

const statusBadge = (status: User["status"]) => {
  const map = { active: "kernel", suspended: "threat", invited: "telemetry" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
};

export default function EditUserPage({ params }: { params: { id: string } }) {
  const user: User =
    USERS.find((item) => item.id === params.id) ?? {
      id: params.id,
      name: "Unknown user",
      email: "—",
      role: "member",
      status: "invited",
      plan: "Starter",
      joined: "—",
      lastActive: "—",
    };

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<User["role"]>(user.role);
  const [status, setStatus] = useState<User["status"]>(user.status);
  const [plan, setPlan] = useState(user.plan);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const userHref = `/users/${encodeURIComponent(user.id)}`;

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
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${user.name}`}
        description={`Account ${user.id}`}
        breadcrumbs={[
          { label: "Management" },
          { label: "Users", href: "/users" },
          { label: user.name },
        ]}
        actions={<Button variant="secondary" href="/users">Back to Users</Button>}
      />

      {saved && (
        <div className="rounded-md border border-kernel/30 bg-kernel/5 p-4 text-[12.5px] text-kernel">
          User profile changes saved in the cached console.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-user-name" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Full name
              </label>
              <input
                id="edit-user-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="edit-user-email" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Email address
              </label>
              <input
                id="edit-user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="edit-user-role" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Role
              </label>
              <select
                id="edit-user-role"
                value={role}
                onChange={(event) => setRole(event.target.value as User["role"])}
                className="admin-input w-full"
              >
                <option value="admin">admin</option>
                <option value="member">member</option>
                <option value="viewer">viewer</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-user-status" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Status
              </label>
              <select
                id="edit-user-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as User["status"])}
                className="admin-input w-full"
              >
                <option value="active">active</option>
                <option value="invited">invited</option>
                <option value="suspended">suspended</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-user-plan" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Plan
              </label>
              <select
                id="edit-user-plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
                className="admin-input w-full"
              >
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            {error && <p className="text-[12px] text-threat sm:col-span-2">{error}</p>}

            <div className="flex flex-wrap justify-end gap-3 border-t border-hairline pt-5 sm:col-span-2">
              <Button variant="secondary" href="/users">Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Account summary</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {roleBadge(role)}
              {statusBadge(status)}
            </div>
            <dl className="mt-5 space-y-3 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">User ID</dt>
                <dd className="font-mono text-ink">{user.id}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Joined</dt>
                <dd className="font-mono text-ink">{user.joined}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Last active</dt>
                <dd className="font-mono text-ink">{user.lastActive}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-[15px] font-semibold text-ink">Access control</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Suspend the account to revoke workspace access without deleting the user record.
            </p>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              href={`${userHref}/suspend`}
            >
              Suspend User
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
