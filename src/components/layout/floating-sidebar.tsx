"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Compass,
  Dumbbell,
  Headphones,
  Languages,
  LayoutDashboard,
  Lock,
  PenLine,
  SlidersHorizontal,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { LinkPendingIndicator } from "@/components/layout/link-pending-indicator";
import { SidebarProCta } from "@/components/layout/sidebar-pro-cta";
import { UserButton } from "@/components/layout/user-button";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import navStyles from "@/components/style/layout/nav.module.css";
import { mx } from "@/lib/css-module";
import type { PlanId } from "@/lib/billing/plans";
import { prefetchDashboardDestination } from "@/lib/query/prefetch";
import { cn } from "@/lib/utils";

type SidebarUser = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  isPro: boolean;
  plan: PlanId;
};

type NavMatch = "exact" | "prefix";

type NavRoute =
  | "home"
  | "vocabulary"
  | "exercises"
  | "writing"
  | "theory"
  | "listening"
  | "speaking"
  | "guide"
  | "coach"
  | "settings"
  | "account";

type NavItem = {
  href: string;
  key: string;
  icon: LucideIcon;
  match: NavMatch;
  route: NavRoute;
  tint: string;
  pro?: boolean;
};

type NavGroup = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    labelKey: "groups.main",
    items: [
      {
        href: "/",
        key: "dashboard",
        icon: LayoutDashboard,
        match: "exact",
        route: "home",
        tint: "text-module-home-fg",
      },
      {
        href: "/vocabulary",
        key: "vocabulary",
        icon: Languages,
        match: "prefix",
        route: "vocabulary",
        tint: "text-module-vocab-fg",
      },
      {
        href: "/exercises",
        key: "exercises",
        icon: Dumbbell,
        match: "prefix",
        route: "exercises",
        tint: "text-module-exercise-fg",
      },
      {
        href: "/writing",
        key: "writing",
        icon: PenLine,
        match: "prefix",
        route: "writing",
        tint: "text-module-writing-fg",
      },
      {
        href: "/theory",
        key: "theory",
        icon: BookOpen,
        match: "prefix",
        route: "theory",
        tint: "text-module-theory-fg",
      },
    ],
  },
  {
    id: "listenSpeak",
    labelKey: "groups.listenSpeak",
    items: [
      {
        href: "/listening",
        key: "listening",
        icon: Headphones,
        match: "prefix",
        route: "listening",
        tint: "text-module-listen-fg",
      },
      {
        href: "/speaking",
        key: "speaking",
        icon: Video,
        match: "prefix",
        route: "speaking",
        tint: "text-module-speak-fg",
      },
    ],
  },
  {
    id: "more",
    labelKey: "groups.more",
    items: [
      {
        href: "/coach",
        key: "coach",
        icon: Sparkles,
        match: "prefix",
        route: "coach",
        tint: "text-accent-lime",
      },
      {
        href: "/getting-started",
        key: "gettingStarted",
        icon: Compass,
        match: "prefix",
        route: "guide",
        tint: "text-module-guide-fg",
      },
      {
        href: "/settings",
        key: "settings",
        icon: SlidersHorizontal,
        match: "prefix",
        route: "settings",
        tint: "text-module-settings-fg",
      },
    ],
  },
];

function isActivePath(pathname: string, href: string, match: NavMatch) {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarNavProps = SidebarUser & {
  workspaceId?: string;
  onNavigate?: () => void;
};

export function SidebarNav({
  workspaceId,
  onNavigate,
  userName,
  userEmail,
  userImage,
  isPro,
  plan,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("nav");
  const { hasProAccess, openUpgrade } = useProAccess();

  function prefetchItem(href: string) {
    try {
      router.prefetch(href);
    } catch {
      // Prefetch is best-effort.
    }
    void prefetchDashboardDestination(queryClient, href, workspaceId ?? null);
  }

  return (
    <div className="flex h-fit w-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        onPointerEnter={() => prefetchItem("/")}
        onFocus={() => prefetchItem("/")}
        className="mb-3 flex items-center gap-2.5 rounded-lg px-2 py-1 outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo size="md" />
        <LogoWordmark tone="ink" />
      </Link>

      {NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.id} className={cn(groupIndex > 0 && "mt-3")}>
          <p className="px-2.5 pb-1.5 font-heading text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t(group.labelKey)}
          </p>
          <nav className="flex flex-col gap-0.5" aria-label={t(group.labelKey)}>
            {group.items.map((item) => {
              const Icon = item.icon;
              const locked = Boolean(item.pro && !hasProAccess);
              const active =
                !locked && isActivePath(pathname, item.href, item.match);
              const className = cn(
                mx(navStyles, "nav-link", active && "is-active"),
                locked && lockedFeatureClassName,
              );

              if (locked) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    data-nav={item.route}
                    className={className}
                    onClick={() => {
                      onNavigate?.();
                      openUpgrade();
                    }}
                  >
                    <Lock
                      className="nav-link-icon size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    {t(item.key)}
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-nav={item.route}
                  onClick={onNavigate}
                  onPointerEnter={() => prefetchItem(item.href)}
                  onFocus={() => prefetchItem(item.href)}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  <Icon
                    className={cn(
                      "nav-link-icon size-4 shrink-0",
                      active ? undefined : item.tint,
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                  <LinkPendingIndicator />
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="mt-4 border-t border-hairline-cloud pt-3">
        <SidebarProCta plan={plan} onNavigate={onNavigate} />
        <div className="mt-1">
          <UserButton
            name={userName}
            email={userEmail}
            image={userImage}
            isPro={isPro}
            plan={plan}
            onNavigate={onNavigate}
            active={pathname.startsWith("/account")}
          />
        </div>
      </div>
    </div>
  );
}

type FloatingSidebarProps = SidebarUser & {
  workspaceId?: string;
};

export function FloatingSidebar({
  workspaceId,
  ...user
}: FloatingSidebarProps) {
  return (
    <aside className="sticky top-3 hidden h-fit w-[15.5rem] shrink-0 self-start lg:block">
      <div className={mx(navStyles, "floating-panel p-2.5")}>
        <SidebarNav workspaceId={workspaceId} {...user} />
      </div>
    </aside>
  );
}
