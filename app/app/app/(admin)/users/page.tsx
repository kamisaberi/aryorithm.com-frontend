import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
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

export default function UsersPage() {
  const columns = [
    { key: "name", header: "User", render: (u: User) => (
      <div>
        <p className="font-medium text-ink">{u.name}</p>
        <p className="font-mono text-[10px] text-muted">{u.email}</p>
      </div>
    )},
    { key: "role", header: "Role", render: (u: User) => roleBadge(u.role) },
    { key: "status", header: "Status", render: (u: User) => statusBadge(u.status) },
    { key: "plan", header: "Plan", render: (u: User) => <span className="capitalize">{u.plan}</span> },
    { key: "joined", header: "Joined", render: (u: User) => <span className="font-mono text-[11px] text-muted">{u.joined}</span> },
    { key: "lastActive", header: "Last Active", render: (u: User) => <span className="font-mono text-[11px] text-muted">{u.lastActive}</span> },
    { key: "actions", header: "", render: (u: User) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" href={`/users/${u.id}`}>Edit</Button>
        <Button variant="ghost" href={`/users/${u.id}/suspend`}>Suspend</Button>
      </div>
    ), className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Users</h1>
          <p className="mt-1 text-[13px] text-muted">{USERS.length} total users</p>
        </div>
        <Button variant="primary" href="/users/invite">+ Invite User</Button>
      </div>

      <Card>
        <Table columns={columns} data={USERS} keyExtractor={(u) => u.id} />
      </Card>
    </div>
  );
}
