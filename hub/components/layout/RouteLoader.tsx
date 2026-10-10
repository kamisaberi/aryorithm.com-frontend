"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import PageLoader from "./PageLoader";

/** Route-aware loader gate: /explore owns its loading UI (skeletons +
 *  Filtering… indicator), so the fullscreen overlay stays off there —
 *  on entry and during filtering alike. Everywhere else behaves as usual. */
export default function RouteLoader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/explore")) return null;
  return (
    <Suspense fallback={null}>
      <PageLoader />
    </Suspense>
  );
}
