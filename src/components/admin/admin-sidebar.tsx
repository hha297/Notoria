"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Library,
  Shield,
  Users,
  Workflow,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import styles from "@/components/style/admin/admin.module.css";
import { ADMIN_CONTENT_MODULES } from "@/lib/admin/content-modules";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
  { href: "/admin", key: "overview", icon: LayoutDashboard, match: "exact" as const },
  { href: "/admin/users", key: "users", icon: Users, match: "prefix" as const },
  {
    href: "/admin/workspaces",
    key: "workspaces",
    icon: FolderKanban,
    match: "prefix" as const,
  },
  { href: "/admin/jobs", key: "jobs", icon: Workflow, match: "prefix" as const },
  {
    href: "/admin/audit",
    key: "audit",
    icon: ClipboardList,
    match: "prefix" as const,
  },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AdminSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AdminSidebar({ onNavigate, className }: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("admin");

  return (
    <aside className={cn(mx(styles, "admin-sidebar"), className)}>
      <Link
        href="/admin"
        onClick={onNavigate}
        className={mx(styles, "admin-brand")}
      >
        <Logo size="sm" />
        <span className={mx(styles, "admin-brand-meta")}>
          <LogoWordmark tone="ink" />
          <span className={mx(styles, "admin-brand-chip")}>
            <Shield className="size-3" aria-hidden />
            {t("nav.admin")}
          </span>
        </span>
      </Link>

      <nav className={mx(styles, "admin-nav")} aria-label={t("nav.admin")}>
        <div className={mx(styles, "admin-nav-group")}>
          <p className={mx(styles, "admin-nav-label")}>{t("nav.manage")}</p>
          {PRIMARY_LINKS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={mx(styles, "admin-nav-link", active && "is-active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </div>

        <div className={mx(styles, "admin-nav-group")}>
          <p className={mx(styles, "admin-nav-label")}>{t("nav.content")}</p>
          <Link
            href="/admin/content/vocabulary"
            onClick={onNavigate}
            className={mx(
              styles,
              "admin-nav-link",
              pathname.startsWith("/admin/content") && "is-active",
            )}
            aria-current={
              pathname.startsWith("/admin/content") ? "page" : undefined
            }
          >
            <Library className="size-4 shrink-0" aria-hidden />
            {t("nav.contentLibrary")}
          </Link>
          <div className={mx(styles, "admin-nav-sub")}>
            {ADMIN_CONTENT_MODULES.map((module) => {
              const href = `/admin/content/${module}`;
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={module}
                  href={href}
                  onClick={onNavigate}
                  className={mx(
                    styles,
                    "admin-nav-link",
                    active && "is-active",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {t(`modules.${module}`)}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={mx(styles, "admin-nav-group")}>
          <Link
            href="/"
            onClick={onNavigate}
            className={mx(styles, "admin-nav-link")}
          >
            {t("nav.backToApp")}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
