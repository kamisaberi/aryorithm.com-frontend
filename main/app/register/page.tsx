import type { Metadata } from "next";
import RegisterView from "./RegisterView";

export const metadata: Metadata = {
  title: "Register | Aryorithm",
  description: "Create one account for the main site, the fleet dashboard, and the hub.",
};

export default function RegisterPage() {
  return <RegisterView />;
}
