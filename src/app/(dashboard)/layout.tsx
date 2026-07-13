import { AppSidebar } from "@/components/layout/app-sidebar";
import { WorkplaceSelector } from "@/components/layout/workplace-selector";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getWorkplaceLanguage } from "@/lib/workplace";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workplaceLanguage = await getWorkplaceLanguage();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline-cloud bg-background px-6">
          <SidebarTrigger className="-ml-1 text-ink" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <WorkplaceSelector value={workplaceLanguage} />
        </header>
        <main className="flex-1 overflow-auto bg-background px-6 py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
