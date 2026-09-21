import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (!user) {
    redirect("/sign-in?callbackUrl=/onboarding");
  }

  return <div className="onboarding-layout">{children}</div>;
}
