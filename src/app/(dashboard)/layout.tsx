import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardDocumentTitle } from "@/components/layout/dashboard-document-title";
import { DashboardStudio } from "@/components/layout/dashboard-studio";
import { SiteFooter } from "@/components/layout/site-footer";
import { WorkspaceOnboardingGate } from "@/components/onboarding/workspace-onboarding-gate";
import { WelcomePromptModal } from "@/components/prompts/welcome-prompt";
import { ProAccessProvider } from "@/components/billing/pro-access-provider";
import { AiPreferencesProvider } from "@/components/providers/ai-preferences-provider";
import { locales, type AppLocale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/i18n/request";
import { getResolvedAiPreferences } from "@/lib/ai/preferences-server";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { getSession } from "@/lib/auth/session";
import {
  getCurrentSubscription,
  hasActiveProSubscription,
} from "@/lib/stripe/pro";
import { displayPlan } from "@/lib/billing/plans";
import { createPerfTimer } from "@/lib/perf/dev-timing";
import { getUserWorkspaces, getActiveWorkspace } from "@/lib/workspace";

export const preferredRegion = ["fra1"];

/** Escape root SEO title; DashboardDocumentTitle owns tab labels. */
export const metadata: Metadata = {
  title: {
    absolute: "Notoria",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const timer = createPerfTimer("dashboard.layout");
  const [workspaces, activeWorkspace, session, subscription, proAccess, aiPreferences] =
    await Promise.all([
      getUserWorkspaces(),
      getActiveWorkspace(),
      getSession(),
      getCurrentSubscription(),
      getCurrentProAccess(),
      getResolvedAiPreferences(),
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
    <ProAccessProvider
      hasProAccess={proAccess.hasProAccess}
      plan={displayPlan(subscription)}
      cancelAtPeriodEnd={Boolean(
        subscription?.stripeCancelAtPeriodEnd && displayPlan(subscription) !== "free",
      )}
      currentPeriodEnd={subscription?.stripeCurrentPeriodEnd?.toISOString() ?? null}
    >
      <AiPreferencesProvider initial={aiPreferences}>
      <DashboardDocumentTitle />
      <DashboardStudio
        locale={locale}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace?.id}
        userName={session?.user?.name ?? "User"}
        userEmail={session?.user?.email ?? ""}
        userImage={session?.user?.image}
        isPro={hasActiveProSubscription(subscription)}
        plan={displayPlan(subscription)}
        footer={<SiteFooter variant="app" />}
      >
        <WelcomePromptModal
          hasWorkspace={Boolean(activeWorkspace)}
          languageCode={activeWorkspace?.language ?? null}
        />
        <WorkspaceOnboardingGate workspaceId={activeWorkspace?.id ?? null} />
        {children}
      </DashboardStudio>
      </AiPreferencesProvider>
    </ProAccessProvider>
  );
}
