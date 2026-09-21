import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardDocumentTitle } from "@/components/layout/dashboard-document-title";
import { DashboardStudio } from "@/components/layout/dashboard-studio";
import { WorkspaceOnboardingGate } from "@/components/onboarding/workspace-onboarding-gate";
import { WelcomePromptModal } from "@/components/prompts/welcome-prompt";
import { ProAccessProvider } from "@/components/billing/pro-access-provider";
import { locales, type AppLocale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/i18n/request";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { getSession } from "@/lib/auth/session";
import {
  getCurrentSubscription,
  hasActiveProSubscription,
} from "@/lib/stripe/pro";
import { createPerfTimer } from "@/lib/perf/dev-timing";
import { getUserWorkspaces, getActiveWorkspace } from "@/lib/workspace";

export const preferredRegion = ["fra1"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const timer = createPerfTimer("dashboard.layout");
  const [workspaces, activeWorkspace, session, subscription, proAccess] =
    await Promise.all([
      getUserWorkspaces(),
      getActiveWorkspace(),
      getSession(),
      getCurrentSubscription(),
      getCurrentProAccess(),
    ]);
  timer.finish();

  if (workspaces.length === 0) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    localeCookie && locales.includes(localeCookie as AppLocale)
      ? (localeCookie as AppLocale)
      : "en";

  return (
    <ProAccessProvider hasProAccess={proAccess.hasProAccess}>
      <DashboardDocumentTitle />
      <DashboardStudio
        locale={locale}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace?.id}
        userName={session?.user?.name ?? "User"}
        userEmail={session?.user?.email ?? ""}
        userImage={session?.user?.image}
        isPro={hasActiveProSubscription(subscription)}
      >
        <WelcomePromptModal
          hasWorkspace={Boolean(activeWorkspace)}
          languageCode={activeWorkspace?.language ?? null}
        />
        <WorkspaceOnboardingGate workspaceId={activeWorkspace?.id ?? null} />
        {children}
      </DashboardStudio>
    </ProAccessProvider>
  );
}
