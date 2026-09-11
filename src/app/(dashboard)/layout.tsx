import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardDocumentTitle } from "@/components/layout/dashboard-document-title";
import { LocaleSelector } from "@/components/layout/locale-selector";
import { WorkspaceSelector } from "@/components/layout/workspace-selector";
import { WorkspaceOnboardingGate } from "@/components/onboarding/workspace-onboarding-gate";
import { WelcomePromptModal } from "@/components/prompts/welcome-prompt";
import { ProAccessProvider } from "@/components/billing/pro-access-provider";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { locales, type AppLocale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/i18n/request";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { getSession } from "@/lib/auth/session";
import {
  getCurrentSubscription,
  hasActiveProSubscription,
} from "@/lib/stripe/pro";
import { getUserWorkspaces, getActiveWorkspace } from "@/lib/workspace";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [workspaces, activeWorkspace, session, subscription, proAccess] =
    await Promise.all([
      getUserWorkspaces(),
      getActiveWorkspace(),
      getSession(),
      getCurrentSubscription(),
      getCurrentProAccess(),
    ]);

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    localeCookie && locales.includes(localeCookie as AppLocale)
      ? (localeCookie as AppLocale)
      : "en";

  return (
    <ProAccessProvider hasProAccess={proAccess.hasProAccess}>
      <SidebarProvider>
        <DashboardDocumentTitle />
        <AppSidebar
          userName={session?.user?.name ?? "User"}
          userEmail={session?.user?.email ?? ""}
          userImage={session?.user?.image}
          isPro={hasActiveProSubscription(subscription)}
        />
        <SidebarInset className="min-w-0 max-w-full bg-background">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline-cloud bg-background px-3 sm:gap-3 sm:px-6">
            <SidebarTrigger className="-ml-0.5 shrink-0 text-ink sm:-ml-1" />
            <WorkspaceSelector
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspace?.id}
            />
            <div className="ml-auto flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
              <LocaleSelector value={locale} />
            </div>
          </header>
          <WelcomePromptModal
            hasWorkspace={Boolean(activeWorkspace)}
            languageCode={activeWorkspace?.language ?? null}
          />
          <WorkspaceOnboardingGate workspaceId={activeWorkspace?.id ?? null} />
          <main className="min-w-0 flex-1 overflow-auto bg-background px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full min-w-0 max-w-7xl">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProAccessProvider>
  );
}
