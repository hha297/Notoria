"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { LocaleThemeControls } from "@/components/layout/locale-theme-controls";
import { WorkspaceSelector } from "@/components/layout/workspace-selector";
import { FloatingSidebar, SidebarNav } from "@/components/layout/floating-sidebar";
import { WorkspaceSearch } from "@/components/search/workspace-search";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShortcutActionsProvider } from "@/components/preferences/shortcut-actions";
import type { Workspace } from "@/db/schema";
import type { AppLocale } from "@/i18n/config";
import type { PlanId } from "@/lib/billing/plans";
import { exerciseDetailSlugFromPath } from "@/lib/exercise-accents";
import { cn } from "@/lib/utils";

function studioSceneFromPath(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/vocabulary")) return "vocabulary";
  if (pathname.startsWith("/exercises")) return "exercises";
  if (pathname.startsWith("/theory")) return "theory";
  if (pathname.startsWith("/reading")) return "read";
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
  plan: PlanId;
  isAdmin?: boolean;
  isTester?: boolean;
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
  plan,
  isAdmin = false,
  isTester = false,
}: DashboardStudioProps) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const studioScene = studioSceneFromPath(pathname);
  const exerciseDetailSlug = exerciseDetailSlugFromPath(pathname);
  const t = useTranslations("nav");
  const sidebarUser = {
    userName,
    userEmail,
    userImage,
    isPro,
    plan,
    isAdmin,
    isTester,
  };
  const stackRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stack = stackRef.current;
    const chrome = chromeRef.current;
    if (!stack || !chrome) return;

    const syncChromeOffset = () => {
      const height = `${chrome.offsetHeight}px`;
      stack.style.setProperty("--studio-chrome-height", height);
      // Navbar scrolls away — in-page stickies only clear the page inset
      stack.style.setProperty(
        "--studio-chrome-offset",
        `var(--studio-inset, 1.25rem)`,
      );
    };

    syncChromeOffset();
    const ro = new ResizeObserver(syncChromeOffset);
    ro.observe(chrome);
    return () => ro.disconnect();
  }, []);

  // Mirror page/exercise accent onto <html> so portaled menus/selects match.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-portal-scene", studioScene);
    if (exerciseDetailSlug) {
      root.setAttribute("data-portal-exercise", exerciseDetailSlug);
    } else {
      root.removeAttribute("data-portal-exercise");
    }
    return () => {
      root.removeAttribute("data-portal-scene");
      root.removeAttribute("data-portal-exercise");
    };
  }, [studioScene, exerciseDetailSlug]);

  return (
    <ShortcutActionsProvider>
      {/*
        Document scrolls naturally. Sidebar is position:sticky inside the
        content row so it unsticks before the footer (normal-flow containing block).
      */}
      <div className="studio-shell flex min-h-svh flex-col">
        {/*
          Sticky sidebar lives in normal flow beside main content so its
          containing block ends above the footer (no absolute overlay / z-fight).
        */}
        <div className="flex min-h-0 flex-1 flex-col px-2 pt-3 sm:px-3 sm:pt-5">
          <div
            className="mx-auto flex w-full max-w-[90rem] min-h-0 flex-1 items-stretch gap-4 sm:gap-6"
            data-studio-scene={studioScene}
            data-exercise={exerciseDetailSlug ?? undefined}
          >
            <div className="hidden w-[15.5rem] shrink-0 lg:block">
              <div className="sticky top-5 z-20">
                <FloatingSidebar
                  workspaceId={activeWorkspaceId}
                  {...sidebarUser}
                />
              </div>
            </div>

            <div
              ref={stackRef}
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 self-stretch sm:gap-3 [--studio-inset:0.75rem] sm:[--studio-inset:1.25rem] [--studio-stack-gap:0.5rem] sm:[--studio-stack-gap:0.75rem] [--studio-chrome-height:3.25rem] sm:[--studio-chrome-height:calc(3.5rem+1px)] [--studio-chrome-offset:var(--studio-inset)]"
            >
              <header
                ref={chromeRef}
                className="studio-chrome z-20 shrink-0"
                data-studio-scene={studioScene}
                data-exercise={exerciseDetailSlug ?? undefined}
              >
                {/*
                  Mobile: Menu · Search · Workspace (language/theme live in the drawer).
                  Desktop (lg+): also Language + Theme in the chrome row.
                  Search grows; workspace select has its own stable desktop width
                  (create CTA is shrink-0 beside it, not inside a max-width box).
                */}
                <div
                  className={cn(
                    "group/chrome flex h-auto items-center gap-1.5 px-2 py-1.5 sm:h-14 sm:gap-2 sm:px-4 sm:py-0",
                    /* Expanded search: even inset — no leftover gap from collapsed siblings */
                    "max-sm:has-[[data-mobile-search]]:gap-0",
                  )}
                >
                  {/* Mobile: Menu · Workspace · Search icon. Desktop: Search grows, then workspace. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      "studio-chrome-control control-surface h-9 w-9 min-w-9 shrink-0 sm:h-10 sm:w-10 sm:min-w-10 lg:hidden",
                      "max-sm:overflow-hidden max-sm:transition-[min-width,width,opacity,padding,border-color] max-sm:duration-300 max-sm:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                      "max-sm:group-has-[[data-mobile-search]]/chrome:pointer-events-none max-sm:group-has-[[data-mobile-search]]/chrome:w-0 max-sm:group-has-[[data-mobile-search]]/chrome:min-w-0 max-sm:group-has-[[data-mobile-search]]/chrome:opacity-0 max-sm:group-has-[[data-mobile-search]]/chrome:border-transparent max-sm:group-has-[[data-mobile-search]]/chrome:px-0",
                    )}
                    aria-label={t("groups.main")}
                    onClick={() => setNavOpen(true)}
                  >
                    <Menu className="size-4" />
                  </Button>

                  <WorkspaceSelector
                    className={cn(
                      "min-w-0 max-sm:flex-1 max-sm:basis-0 sm:order-3 sm:flex-none",
                      "max-sm:transition-[max-width,opacity,flex-grow,flex-basis] max-sm:duration-300 max-sm:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                      "max-sm:group-has-[[data-mobile-search]]/chrome:pointer-events-none max-sm:group-has-[[data-mobile-search]]/chrome:max-w-0 max-sm:group-has-[[data-mobile-search]]/chrome:min-w-0 max-sm:group-has-[[data-mobile-search]]/chrome:flex-[0_0_0] max-sm:group-has-[[data-mobile-search]]/chrome:basis-0 max-sm:group-has-[[data-mobile-search]]/chrome:opacity-0 max-sm:group-has-[[data-mobile-search]]/chrome:overflow-hidden",
                    )}
                    workspaces={workspaces}
                    activeWorkspaceId={activeWorkspaceId}
                  />

                  {activeWorkspaceId ? (
                    <div
                      className={cn(
                        "min-w-0 max-sm:shrink-0 sm:order-2 sm:flex-1 sm:basis-0",
                        "max-sm:group-has-[[data-mobile-search]]/chrome:flex-1 max-sm:group-has-[[data-mobile-search]]/chrome:basis-0 max-sm:group-has-[[data-mobile-search]]/chrome:min-w-0",
                      )}
                    >
                      <WorkspaceSearch
                        workspaceId={activeWorkspaceId}
                        compact
                      />
                    </div>
                  ) : (
                    <div className="hidden min-w-0 flex-1 basis-0 sm:order-2 sm:block" />
                  )}

                  <LocaleThemeControls
                    locale={locale}
                    compact
                    className="hidden lg:flex sm:order-4"
                  />
                </div>
              </header>

              <div
                className="studio-paper flex min-h-0 min-w-0 flex-col max-sm:h-auto max-sm:flex-none max-sm:grow-0 sm:flex-1"
                data-studio-scene={studioScene}
                data-exercise={exerciseDetailSlug ?? undefined}
              >
                <main
                  className={cn(
                    /* No overflow-x-clip here: with overflow-y:visible it computes to
                       a scrollport and fights document scroll / sticky docking. */
                    "min-h-0 min-w-0 sm:flex-1 sm:px-6 sm:pt-8",
                    /* Theory/writing TipTap sheets: tighter mobile inset so content isn't squeezed. */
                    pathname.startsWith("/writing/") ||
                      pathname.startsWith("/theory/")
                      ? "px-2.5 pt-3 [--studio-main-pad:0.625rem] [--studio-main-pt:0.75rem] sm:pt-8 sm:[--studio-main-pad:1.5rem] sm:[--studio-main-pt:2rem]"
                      : "px-3 pt-4 [--studio-main-pad:0.75rem] [--studio-main-pt:1rem] sm:px-6 sm:pt-8 sm:[--studio-main-pad:1.5rem] sm:[--studio-main-pt:2rem]",
                    pathname === "/writing" ||
                      pathname.startsWith("/writing/folders") ||
                      pathname === "/theory" ||
                      pathname.startsWith("/theory/folders")
                      ? "pb-3 sm:pb-4 [--studio-main-pb:0.75rem] sm:[--studio-main-pb:1rem]"
                      : "pb-6 sm:pb-8 [--studio-main-pb:1.5rem] sm:[--studio-main-pb:2rem]",
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto w-full min-w-0",
                      pathname.startsWith("/writing/") ||
                        pathname.startsWith("/reading/") ||
                        pathname.startsWith("/theory/") ||
                        pathname.startsWith("/listening/") ||
                        pathname.startsWith("/speaking/")
                        ? "max-w-[90rem]"
                        : "max-w-6xl",
                    )}
                  >
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>

        {footer ? (
          <div className="studio-site-footer w-full shrink-0">{footer}</div>
        ) : null}

        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            className="studio-chrome flex h-full w-[17.5rem] flex-col gap-0 p-3 sm:max-w-[17.5rem]"
            data-studio-scene={studioScene}
            data-exercise={exerciseDetailSlug ?? undefined}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("workspace")}</SheetTitle>
            </SheetHeader>
            <SidebarNav
              workspaceId={activeWorkspaceId}
              layout="drawer"
              locale={locale}
              onNavigate={() => setNavOpen(false)}
              {...sidebarUser}
            />
          </SheetContent>
        </Sheet>
      </div>
    </ShortcutActionsProvider>
  );
}
