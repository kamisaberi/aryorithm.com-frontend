"use client";

import Link from "next/link";
import { NAV } from "@/data/navigation";

export default function MobileDrawer({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav id="mobile-nav" aria-label="Mobile" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-hairline bg-panel lg:hidden">
      <ul className="divide-y divide-hairline">
        {NAV.map((group) => (
          <li key={group.label} className="px-5 py-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">{group.label}</span>
            {group.items ? (
              <ul className="mt-2 space-y-2">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.section ? `${item.to}#${item.section}` : item.to}
                      onClick={onNavigate}
                      className="block text-[14px] text-ink hover:text-cyan"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link href={group.to ?? "/"} onClick={onNavigate} className="mt-2 block text-[14px] text-ink hover:text-cyan">
                View {group.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <div className="space-y-2.5 px-5 py-4">
        <Link
          href="/portal"
          onClick={onNavigate}
          className="block rounded-md border border-hairline px-4 py-2.5 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted"
        >
          Portal
        </Link>
        <Link
          href="/contact"
          onClick={onNavigate}
          className="block rounded-md bg-cyan px-4 py-2.5 text-center font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void"
        >
          Schedule Pilot
        </Link>
      </div>
    </nav>
  );
}
