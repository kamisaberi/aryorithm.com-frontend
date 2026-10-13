import type { Metadata } from "next";
import LoginView from "./LoginView";

export const metadata: Metadata = {
  title: "Login | Aryorithm",
  description: "Sign in — one shared login for the main site, the fleet dashboard, and the hub.",
};

export default function LoginPage() {
  return <LoginView />;
}
