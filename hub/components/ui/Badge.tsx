interface BadgeProps {
  variant: "kernel" | "threat" | "telemetry" | "cyan" | "muted";
  children: React.ReactNode;
}

const variantStyles: Record<BadgeProps["variant"], string> = {
  kernel: "border-kernel/30 bg-kernel/10 text-kernel",
  threat: "border-threat/30 bg-threat/10 text-threat",
  telemetry: "border-telemetry/30 bg-telemetry/10 text-telemetry",
  cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  muted: "border-hairline bg-panel text-muted",
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
