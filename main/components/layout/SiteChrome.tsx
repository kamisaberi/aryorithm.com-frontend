"use client";

import { usePathname } from "next/navigation";

/**
 * Renders the public site chrome (header, footer, route loader) everywhere
 * except the hidden SSO bridge page. The bridge is embedded as an iframe on
 * every app, so mounting the full shell there would recursively boot another
 * account widget / bridge request. Server-rendered slots are passed in as
 * props so the footer and page content stay server components.
 */
export default function SiteChrome({
  header,
  footer,
  loader,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  loader: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/auth-bridge") {
    return <>{children}</>;
  }

  return (
    <>
      {loader}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {header}
      <main id="main-content">{children}</main>
      {footer}
    </>
  );
}
