import type { Metadata } from "next";
import ProfileView from "./ProfileView";

export const metadata: Metadata = {
  title: "Member Profile | Aryorithm",
  description:
    "Your Aryorithm membership — one shared login for the fleet dashboard and the extension hub.",
};

export default function ProfilePage() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 py-12 pt-24 lg:px-8">
      <ProfileView />
    </section>
  );
}
