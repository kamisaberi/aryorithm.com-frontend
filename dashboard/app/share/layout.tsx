import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signed artifact share | Aryorithm",
  description: "Time-bounded, signed artifact access issued by an Aryorithm workspace.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
