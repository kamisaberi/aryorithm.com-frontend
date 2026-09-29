import Link from "next/link";

export interface SidebarSection {
  heading: string;
  items: { label: string; href: string; meta?: string }[];
}

interface PageSidebarProps {
  sections: SidebarSection[];
  cta?: { label: string; href: string };
}

export default function PageSidebar({ sections, cta }: PageSidebarProps) {
  return (
    <aside className="w-full shrink-0 lg:w-64 xl:w-72">
      <div className="space-y-6 lg:sticky lg:top-24">
        {sections.map((section) => (
          <div key={section.heading} className="rounded-md border border-hairline bg-panel p-4">
            <h3 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">{section.heading}</h3>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-start justify-between gap-2 text-[12.5px] leading-snug text-muted transition-colors hover:text-cyan"
                  >
                    <span>{item.label}</span>
                    {item.meta && (
                      <span className="shrink-0 font-mono text-[10px] text-muted/60 group-hover:text-cyan/60">
                        {item.meta}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {cta && (
          <Link
            href={cta.href}
            className="block rounded-md bg-cyan px-4 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </aside>
  );
}
