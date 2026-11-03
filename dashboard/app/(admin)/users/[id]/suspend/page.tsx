"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { USERS } from "@/data/admin";
import { User } from "@/types/admin";

const statusBadge = (status: User["status"]) => {
  const map = { active: "kernel", suspended: "threat", invited: "telemetry" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
};

export default function SuspendUserPage({ params }: { params: { id: string } }) {
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

  const [status, setStatus] = useState<User["status"]>(user.status);
  const isSuspended = status === "suspended";
  const userHref = `/users/${encodeURIComponent(user.id)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSuspended ? "Reactivate User" : "Suspend User"}
        description={`Review access changes for ${user.name}.`}
        breadcrumbs={[
          { label: "Management" },
          { label: "Users", href: "/users" },
          { label: user.name, href: userHref },
          { label: isSuspended ? "Reactivate" : "Suspend" },
        ]}
        actions={<Button variant="secondary" href={userHref}>Back to User</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Account</p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">{user.name}</h2>
              <p className="mt-1 font-mono text-[11px] text-muted">{user.email}</p>
            </div>
            {statusBadge(status)}
          </div>

          <div className="mt-6 rounded-md border border-hairline bg-void/40 p-4">
            <p className="text-[13px] leading-relaxed text-ink">
              {isSuspended
                ? "Reactivating this account restores normal workspace access. Existing sessions may need to be refreshed."
                : "Suspending this account immediately revokes access to the dashboard, API, and artifact workspace. The user record is preserved."}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant={isSuspended ? "primary" : "secondary"}
              onClick={() => setStatus(isSuspended ? "active" : "suspended")}
            >
              {isSuspended ? "Reactivate User" : "Suspend User"}
            </Button>
            <Button variant="secondary" href={userHref}>Keep Current Status</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-[15px] font-semibold text-ink">Account details</h2>
          <dl className="mt-4 space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">User ID</dt>
              <dd className="font-mono text-ink">{user.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Role</dt>
              <dd className="capitalize text-ink">{user.role}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Plan</dt>
              <dd className="text-ink">{user.plan}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Last active</dt>
              <dd className="font-mono text-ink">{user.lastActive}</dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-hairline pt-4 font-mono text-[10.5px] leading-relaxed text-muted">
            This console uses cached account data. Connect the identity service to propagate suspension to all
            sessions.
          </p>
        </Card>
      </div>
    </div>
  );
}
