import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LearningLanguageOnboarding } from "@/components/onboarding/learning-language-onboarding";
import { getUserWorkspaces } from "@/lib/workspace";

export async function generateMetadata() {
  const t = await getTranslations("learningOnboarding");
  return {
    title: t("title"),
  };
}

export default async function OnboardingPage() {
  const workspaces = await getUserWorkspaces();

  if (workspaces.length > 0) {
    redirect("/");
  }

  return <LearningLanguageOnboarding />;
}
