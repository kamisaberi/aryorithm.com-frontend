interface CapTooltipProps {
  name: string;
  justification?: string;
}

/** Kernel capability hover card (§3.2): privilege, justification, isolation. */
export default function CapTooltip({ name, justification }: CapTooltipProps) {
  return (
    <span className="group relative inline-block">
      <span className="cursor-help rounded border border-telemetry/40 bg-telemetry/10 px-1.5 py-0.5 font-mono text-[10px] text-telemetry">
        {name}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-md border border-hairline bg-void p-3 shadow-2xl shadow-black/60 group-hover:block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-telemetry">
          Kernel Privilege
        </span>
        <span className="mt-1 block text-[12px] font-medium text-ink">{name}</span>
        <span className="mt-1 block text-[12px] leading-relaxed text-muted">
          {justification || "Declared by the author in splugin.yaml."}
        </span>
        <span className="mt-2 block border-t border-hairline pt-2 font-mono text-[10px] text-muted">
          Isolation: driver space only — no host filesystem or shell root access.
        </span>
      </span>
    </span>
  );
}
