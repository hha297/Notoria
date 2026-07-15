import { AppSidebar } from "@/components/layout/app-sidebar";
import { LocaleSelector } from "@/components/layout/locale-selector";
import { WorkspaceSelector } from "@/components/layout/workspace-selector";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { locales, type AppLocale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/i18n/request";
import { getUserWorkspaces, getActiveWorkspace } from "@/lib/workspace";
import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [workspaces, activeWorkspace, session] = await Promise.all([
    getUserWorkspaces(),
    getActiveWorkspace(),
    getSession(),
  ]);

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    localeCookie && locales.includes(localeCookie as AppLocale)
      ? (localeCookie as AppLocale)
      : "en";

  return (
    <SidebarProvider>
      <AppSidebar
        userName={session?.user?.name ?? "User"}
        userEmail={session?.user?.email ?? ""}
        userImage={session?.user?.image}
      />
      <SidebarInset className="bg-background">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline-cloud bg-background px-6">
          <SidebarTrigger className="-ml-1 text-ink" />
          <Separator orientation="vertical" className="h-4" />
          <WorkspaceSelector
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspace?.id}
          />
          <div className="ml-auto">
            <LocaleSelector value={locale} />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background px-6 py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
