import { redirect } from "next/navigation";
import styles from "@/components/style/onboarding/learning-language.module.css";
import { requireUser } from "@/lib/auth/session";
import { mx } from "@/lib/css-module";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (!user) {
    redirect("/sign-in?callbackUrl=/onboarding");
  }

  return <div className={mx(styles, "onboarding-layout")}>{children}</div>;
}
