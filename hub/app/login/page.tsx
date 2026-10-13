import type { Metadata } from "next";
import LoginView from "./LoginView";

export const metadata: Metadata = {
  title: "Login | Aryorithm Hub",
  description: "Sign in — one shared login for the hub, the fleet dashboard, and the main site.",
};

export default function LoginPage() {
  return <LoginView />;
}
