import Link from "next/link";
import type { BreadcrumbStep } from "@/types/navigation";

export default function Breadcrumb({ trail }: { trail: BreadcrumbStep[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
      <Link href="/" className="transition-colors hover:text-cyan">
        Home
      </Link>
      {trail.map((step, i) => (
        <span key={step.label} className="flex items-center">
          <span className="mx-2 text-hairline" aria-hidden="true">
            /
          </span>
          {step.to ? (
            <Link href={step.section ? `${step.to}#${step.section}` : step.to} className="transition-colors hover:text-cyan">
              {step.label}
            </Link>
          ) : (
            <span className={i === trail.length - 1 ? "text-cyan" : "text-muted"}>{step.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
