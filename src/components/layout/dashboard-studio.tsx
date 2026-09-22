"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSelector } from "@/components/layout/locale-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WorkspaceSelector } from "@/components/layout/workspace-selector";
import { FloatingSidebar, SidebarNav } from "@/components/layout/floating-sidebar";
import { WorkspaceSearch } from "@/components/search/workspace-search";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShortcutActionsProvider } from "@/components/preferences/shortcut-actions";
import type { Workspace } from "@/db/schema";
import type { AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

function studioSceneFromPath(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/vocabulary")) return "vocabulary";
  if (pathname.startsWith("/exercises")) return "exercises";
  if (pathname.startsWith("/theory")) return "theory";
  if (pathname.startsWith("/writing")) return "writing";
  if (pathname.startsWith("/listening")) return "listen";
  if (pathname.startsWith("/speaking")) return "speak";
  if (pathname.startsWith("/getting-started")) return "guide";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/account")) return "account";
  return "home";
}

type DashboardStudioProps = {
  children: ReactNode;
  footer?: ReactNode;
  locale: AppLocale;
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  isPro: boolean;
};

export function DashboardStudio({
  children,
  footer,
  locale,
  workspaces,
  activeWorkspaceId,
  userName,
  userEmail,
  userImage,
  isPro,
}: DashboardStudioProps) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");
  const sidebarUser = { userName, userEmail, userImage, isPro };

  return (
    <ShortcutActionsProvider>
      <div className="studio-shell min-h-svh p-3">
        <div className="mx-auto flex max-w-[90rem] items-start gap-3">
          <FloatingSidebar workspaceId={activeWorkspaceId} {...sidebarUser} />

          <div
            className="studio-paper flex h-[calc(100svh-1.5rem)] min-h-0 min-w-0 flex-1 flex-col self-stretch overflow-hidden"
            data-studio-scene={studioSceneFromPath(pathname)}
          >
            <header className="studio-chrome sticky top-0 z-20">
              <div className="flex h-14 min-w-0 items-center gap-2 px-3 sm:px-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 lg:hidden"
                  onClick={() => setNavOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu className="size-4" />
                </Button>
                {activeWorkspaceId ? (
                  <div className="min-w-0 flex-1">
                    <WorkspaceSearch workspaceId={activeWorkspaceId} compact />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1" />
                )}
                <WorkspaceSelector
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                />
                <LocaleSelector value={locale} />
                <ThemeToggle />
              </div>
            </header>
            <main
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
                pathname === "/writing" ||
                  pathname.startsWith("/writing/folders") ||
                  pathname === "/theory" ||
                  pathname.startsWith("/theory/folders")
                  ? "pb-3 sm:pb-4"
                  : "pb-4 sm:pb-5",
              )}
            >
              <div
                className={cn(
                  "mx-auto w-full min-w-0 flex-1 px-4 pt-6 sm:px-6 sm:pt-8",
                  pathname.startsWith("/writing/") ||
                    pathname.startsWith("/theory/") ||
                    pathname.startsWith("/listening/") ||
                    pathname.startsWith("/speaking/")
                    ? "max-w-[90rem]"
                    : "max-w-6xl",
                )}
              >
                {children}
              </div>
              {footer ? (
                <div className="mt-auto w-full shrink-0 border-t border-hairline-cloud/80 px-4 pt-1 sm:px-6">
                  {footer}
                </div>
              ) : null}
            </main>
          </div>
        </div>

        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            className="w-[17.5rem] gap-0 border-hairline-cloud bg-surface-elevated p-3 sm:max-w-[17.5rem]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("workspace")}</SheetTitle>
            </SheetHeader>
            <SidebarNav
              workspaceId={activeWorkspaceId}
              onNavigate={() => setNavOpen(false)}
              {...sidebarUser}
            />
          </SheetContent>
        </Sheet>
      </div>
    </ShortcutActionsProvider>
  );
}
