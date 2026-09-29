import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

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
  title: "Aryorithm — Admin Console",
  description: "Aryorithm Technologies SaaS Service Manager & Admin Dashboard",
};

export const viewport = {
  themeColor: "#07090E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`scroll-smooth ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-void font-sans text-ink antialiased selection:bg-cyan/25">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
