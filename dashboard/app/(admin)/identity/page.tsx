"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_IDENTITY } from "@/data/dummy";
import { useAuth } from "@/lib/auth";

export default function IdentityPage() {
  const { token } = useAuth();
  const { data, live } = useBackend(DUMMY_IDENTITY, (t) => backend.identityBot(t), token);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity & Bot"
        description="Identity management, bot detection, and access control"
        breadcrumbs={[{ label: "Collective Grid", href: "/threat-bus" }, { label: "Identity & Bot" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "live" : "cached"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Impossible Velocity Hits
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-threat">
            {data.impossible_velocity_hits}
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Bot Kinematic Blocks
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">
            {data.bot_kinematic_blocks}
          </p>
        </Card>
      </div>
    </div>
  );
}
