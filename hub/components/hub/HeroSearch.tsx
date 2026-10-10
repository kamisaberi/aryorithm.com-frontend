"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PILLS = [
  { label: "All Packages", href: "/explore" },
  { label: "Native C++20", href: "/explore?tier=native" },
  { label: "Wasm", href: "/explore?tier=wasm" },
  { label: "Lua", href: "/explore?tier=lua" },
];

/** Hero search bar + category drop-pills (§2.1A). */
export default function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(value.trim() ? `/explore?q=${encodeURIComponent(value.trim())}` : "/explore");
        }}
        className="flex items-center gap-3 rounded-md border border-hairline bg-panel px-4 py-3.5 transition-colors focus-within:border-cyan/60"
      >
        <span className="font-mono text-[15px] text-cyan" aria-hidden="true">
          ⌕
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search packages, protocols, sectors..."
          aria-label="Search packages"
          className="w-full bg-transparent text-[15px] text-ink placeholder:text-muted/60 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
        >
          Search
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {PILLS.map((p) => (
          <a
            key={p.label}
            href={p.href}
            className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            [ {p.label} ]
          </a>
        ))}
      </div>
    </div>
  );
}
