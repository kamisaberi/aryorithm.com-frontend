"use client";

import { usePathname } from "next/navigation";
import TopProgressBar from "./TopProgressBar";

/**
 * Renders the public site chrome (header, footer, route progress) everywhere
 * except the hidden SSO bridge page. The bridge is embedded as an iframe on
 * every app, so mounting the full shell there would recursively boot another
 * account widget / bridge request. Server-rendered slots are passed in as
 * props so the footer and page content stay server components.
 */
export default function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/auth-bridge") {
    return <>{children}</>;
  }

  return (
    <>
      <TopProgressBar />
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {header}
      <main id="main-content">{children}</main>
      {footer}
    </>
  );
}
