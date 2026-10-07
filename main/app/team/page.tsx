import type { Metadata } from "next";
import TeamView from "./TeamView";

export const metadata: Metadata = {
  title: "Team & Leadership | Aryorithm",
  description:
    "Kernel architects, systems engineers, and researchers building sovereign cyber-physical defense.",
};

export default function TeamPage() {
  return <TeamView />;
}
