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
import { prefetchDashboardDestination } from "@/lib/query/prefetch";
import { cn } from "@/lib/utils";

type SidebarUser = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  isPro: boolean;
};

type NavMatch = "exact" | "prefix";

type NavItem = {
  href: string;
  key: string;
  icon: LucideIcon;
  match: NavMatch;
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
        tint: "text-primary",
      },
      {
        href: "/vocabulary",
        key: "vocabulary",
        icon: Languages,
        match: "prefix",
        tint: "text-module-vocab-fg",
      },
      {
        href: "/exercises",
        key: "exercises",
        icon: Dumbbell,
        match: "prefix",
        tint: "text-module-exercise-fg",
      },
      {
        href: "/writing",
        key: "writing",
        icon: PenLine,
        match: "prefix",
        tint: "text-module-writing-fg",
      },
      {
        href: "/theory",
        key: "theory",
        icon: BookOpen,
        match: "prefix",
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
        tint: "text-module-listen-fg",
        pro: true,
      },
      {
        href: "/speaking",
        key: "speaking",
        icon: Video,
        match: "prefix",
        tint: "text-module-speak-fg",
        pro: true,
      },
    ],
  },
  {
    id: "more",
    labelKey: "groups.more",
    items: [
      {
        href: "/getting-started",
        key: "gettingStarted",
        icon: Compass,
        match: "prefix",
        tint: "text-muted-foreground",
      },
      {
        href: "/account",
        key: "settings",
        icon: SlidersHorizontal,
        match: "prefix",
        tint: "text-muted-foreground",
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
              const active = !locked && isActivePath(pathname, item.href, item.match);
              const className = cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                locked && lockedFeatureClassName,
                active
                  ? "bg-primary text-on-primary"
                  : "text-ink hover:bg-muted",
              );

              if (locked) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    className={className}
                    onClick={() => {
                      onNavigate?.();
                      openUpgrade();
                    }}
                  >
                    <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {t(item.key)}
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  onPointerEnter={() => prefetchItem(item.href)}
                  onFocus={() => prefetchItem(item.href)}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  <Icon
                    className={cn("size-4 shrink-0", active ? "text-on-primary" : item.tint)}
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
        <SidebarProCta isPro={isPro} onNavigate={onNavigate} />
        <div className={cn(!isPro && "mt-2")}>
          <UserButton
            name={userName}
            email={userEmail}
            image={userImage}
            isPro={isPro}
            onNavigate={onNavigate}
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
      <div className="floating-panel p-2.5">
        <SidebarNav workspaceId={workspaceId} {...user} />
      </div>
    </aside>
  );
}
