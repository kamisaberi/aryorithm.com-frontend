import type { Metadata } from "next";
import RegisterView from "./RegisterView";

export const metadata: Metadata = {
  title: "Register | Aryorithm Hub",
  description: "Create one account for the hub, the fleet dashboard, and the main site.",
};

export default function RegisterPage() {
  return <RegisterView />;
}
