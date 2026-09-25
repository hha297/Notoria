"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Dumbbell,
  Headphones,
  Home,
  Languages,
  Lock,
  PenLine,
  Sparkles,
  Video,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserButton } from "@/components/layout/user-button";
import { SidebarProCta } from "@/components/layout/sidebar-pro-cta";
import { LinkPendingIndicator } from "@/components/layout/link-pending-indicator";
import navStyles from "@/components/style/layout/nav.module.css";
import { mx } from "@/lib/css-module";
import type { PlanId } from "@/lib/billing/plans";
import { prefetchDashboardDestination } from "@/lib/query/prefetch";
import { cn } from "@/lib/utils";

const navItems = [
  { titleKey: "dashboard", href: "/", icon: Home },
  { titleKey: "vocabulary", href: "/vocabulary", icon: Languages },
  { titleKey: "theory", href: "/theory", icon: BookOpen },
  { titleKey: "exercises", href: "/exercises", icon: Dumbbell },
  { titleKey: "writing", href: "/writing", icon: PenLine },
  { titleKey: "listening", href: "/listening", icon: Headphones },
  { titleKey: "speaking", href: "/speaking", icon: Video },
  { titleKey: "coach", href: "/coach", icon: Sparkles },
] as const;

type AppSidebarProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  isPro?: boolean;
  plan?: PlanId;
  workspaceId?: string | null;
};

export function AppSidebar({
  userName,
  userEmail,
  userImage,
  isPro = false,
  plan = "free",
  workspaceId = null,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("nav");
  const { isMobile, setOpenMobile } = useSidebar();
  const { hasProAccess, openUpgrade } = useProAccess();

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  function prefetchItem(href: string) {
    try {
      router.prefetch(href);
    } catch {
      // Prefetch is best-effort.
    }
    void prefetchDashboardDestination(queryClient, href, workspaceId);
  }

  const activePath = pathname;

  return (
    <Sidebar
      collapsible="icon"
      className={mx(
        navStyles,
        "sidebar-starfield border-r border-sidebar-border",
      )}
    >
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3 pb-2">
        <Link
          href="/"
          onClick={closeMobileSidebar}
          onPointerEnter={() => prefetchItem("/")}
          onFocus={() => prefetchItem("/")}
          className={cn(
            "flex items-center rounded-md outline-none transition-opacity hover:opacity-90",
            "group-data-[collapsible=icon]:justify-center",
          )}
        >
          <Logo className="hidden group-data-[collapsible=icon]:block" />
          <div className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:hidden">
            <Logo size="md" />
            <LogoWordmark tone="sidebar" />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-[0.25px] text-on-dark-muted">
            {t("workspace")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const locked = Boolean(
                  "pro" in item &&
                    (item as { pro?: boolean }).pro &&
                    !hasProAccess,
                );
                const isActive =
                  !locked &&
                  (item.href === "/"
                    ? activePath === "/"
                    : activePath.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.titleKey} className="py-0.5">
                    <SidebarMenuButton
                      render={
                        locked ? (
                          <button
                            type="button"
                            onClick={() => {
                              closeMobileSidebar();
                              openUpgrade();
                            }}
                          />
                        ) : (
                          <Link
                            href={item.href}
                            onClick={closeMobileSidebar}
                            onPointerEnter={() => prefetchItem(item.href)}
                            onFocus={() => prefetchItem(item.href)}
                          />
                        )
                      }
                      isActive={isActive}
                      tooltip={t(item.titleKey)}
                      className={cn(
                        "text-sidebar-foreground transition-colors",
                        "hover:bg-accent-lime/25! hover:text-accent-lime!",
                        "data-active:bg-accent-lime/25! data-active:text-accent-lime! data-active:font-medium",
                        locked && lockedFeatureClassName,
                      )}
                    >
                      {locked ? <Lock /> : <item.icon />}
                      <span className="font-medium">{t(item.titleKey)}</span>
                      {!locked ? <LinkPendingIndicator /> : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex flex-col gap-2">
          <SidebarProCta plan={plan} />
          <UserButton
            name={userName}
            email={userEmail}
            image={userImage}
            isPro={isPro}
            plan={plan}
          />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
