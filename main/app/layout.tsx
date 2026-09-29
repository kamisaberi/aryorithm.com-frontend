import type { Metadata } from "next";
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
  title: "Aryorithm Technologies — Deterministic Sub-Millisecond Active Defense for Sovereign Infrastructure",
  description:
    "Aryorithm Technologies delivers autonomous cyber-physical active defense: 0.84µs eBPF/XDP kernel mitigation, libxinfer across 15 silicon backends, and air-gapped collective immunity via Sentinel Nexus.",
};

export const viewport = {
  themeColor: "#07090E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`scroll-smooth ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-void font-sans text-ink antialiased selection:bg-cyan/25">
        <PageLoader />
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
