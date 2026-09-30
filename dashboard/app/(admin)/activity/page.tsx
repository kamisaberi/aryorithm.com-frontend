import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ACTIVITIES } from "@/data/admin";

const typeBadge = (type: string) => {
  const map: Record<string, "cyan" | "kernel" | "threat" | "telemetry" | "muted"> = {
    api: "cyan",
    billing: "telemetry",
    security: "threat",
    user: "kernel",
    system: "muted",
  };
  return <Badge variant={map[type] ?? "muted"}>{type}</Badge>;
};

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Activity Log</h1>
        <p className="mt-1 text-[13px] text-muted">All system events and user actions</p>
      </div>

      <Card>
        <div className="divide-y divide-hairline/60">
          {ACTIVITIES.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 px-5 py-4">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  activity.type === "security"
                    ? "bg-threat"
                    : activity.type === "billing"
                      ? "bg-telemetry"
                      : activity.type === "api"
                        ? "bg-cyan"
                        : activity.type === "user"
                          ? "bg-kernel"
                          : "bg-muted"
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">
                  <span className="font-medium">{activity.actor}</span>{" "}
                  <span className="text-muted">{activity.action}</span>{" "}
                  <span className="font-medium text-cyan">{activity.target}</span>
                </p>
                <div className="mt-1 flex items-center gap-3">
                  {typeBadge(activity.type)}
                  <span className="font-mono text-[10px] text-muted/60">{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
