import type { Metadata } from "next";
import { Suspense } from "react";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageLoader from "@/components/layout/PageLoader";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hub.aryorithm.com"),
  title: "Aryorithm Hub — Extension Mesh for Edge Defense",
  description:
    "Discover, verify, and deploy hardware-accelerated dissectors and AI models to edge nodes: sub-microsecond fast path, air-gapped by default.",
  openGraph: {
    title: "Aryorithm Hub — Extension Mesh for Edge Defense",
    description:
      "Discover, verify, and deploy hardware-accelerated dissectors and AI models to edge nodes without cloud egress.",
    url: "/",
    siteName: "Aryorithm Hub",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Aryorithm Hub — Extension Mesh for Edge Defense",
    description:
      "Discover, verify, and deploy hardware-accelerated dissectors and AI models to edge nodes.",
  },
};

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Aryorithm Hub",
  url: "https://hub.aryorithm.com",
  description:
    "Open extension mesh for cyber-physical edge defense: dissectors, neural models, sandboxed micro-rules.",
};

export const viewport = {
  themeColor: "#07090E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`scroll-smooth ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-void font-sans text-ink antialiased selection:bg-cyan/25">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <Suspense fallback={null}>
          <PageLoader />
        </Suspense>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
