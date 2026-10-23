import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminOverviewCharts } from "@/components/admin/admin-overview-charts";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import styles from "@/components/style/admin/admin.module.css";
import {
  getAdminOverviewMetrics,
  getRecentAdminAudit,
} from "@/lib/admin/overview";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [t, locale, metrics, recent] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    getAdminOverviewMetrics(),
    getRecentAdminAudit(8),
  ]);

  const hero = [
    {
      key: "users",
      value: metrics.totals.users,
      href: "/admin/users",
      tone: "default" as const,
    },
    {
      key: "activeUsers7d",
      value: metrics.totals.activeUsers7d,
      href: "/admin/users",
      tone: "accent" as const,
    },
    {
      key: "workspaces",
      value: metrics.totals.workspaces,
      href: "/admin/workspaces",
      tone: "default" as const,
    },
    {
      key: "contentTotal",
      value: metrics.totals.contentTotal,
      href: "/admin/content/vocabulary",
      tone: "default" as const,
    },
  ];

  const ops = [
    {
      key: "runningJobs",
      value: metrics.totals.runningJobs,
      href: "/admin/jobs",
      tone:
        metrics.totals.runningJobs > 0
          ? ("accent" as const)
          : ("default" as const),
    },
    {
      key: "failedListening",
      value: metrics.totals.failedListening,
      href: "/admin/jobs?kind=listening",
      tone:
        metrics.totals.failedListening > 0
          ? ("warn" as const)
          : ("default" as const),
    },
    {
      key: "failedImports",
      value: metrics.totals.failedImports,
      href: "/admin/jobs?kind=exercise_import",
      tone:
        metrics.totals.failedImports > 0
          ? ("warn" as const)
          : ("default" as const),
    },
    {
      key: "recentAudits7d",
      value: metrics.totals.recentAudits7d,
      href: "/admin/audit",
      tone: "default" as const,
    },
    {
      key: "newUsers7d",
      value: metrics.totals.newUsers7d,
      href: "/admin/users",
      tone: "default" as const,
    },
    {
      key: "newUsers30d",
      value: metrics.totals.newUsers30d,
      href: "/admin/users",
      tone: "default" as const,
    },
  ];

  const tools = [
    { href: "/admin/users", label: t("nav.users") },
    { href: "/admin/workspaces", label: t("nav.workspaces") },
    { href: "/admin/jobs", label: t("nav.jobs") },
    { href: "/admin/audit", label: t("nav.audit") },
    { href: "/admin/content/vocabulary", label: t("nav.contentLibrary") },
  ] as const;

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("nav.admin")}
        title={t("overview.title")}
        description={t("overview.description")}
        actions={
          <div className={mx(styles, "admin-quick-links")}>
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={mx(styles, "admin-quick-link")}
              >
                {tool.label}
              </Link>
            ))}
          </div>
        }
      />

      <section
        className={mx(styles, "admin-hero-metrics")}
        aria-label={t("overview.metrics")}
      >
        {hero.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className={mx(
              styles,
              "admin-hero-metric",
              card.tone === "accent" && "is-accent",
            )}
          >
            <p className={mx(styles, "admin-metric-label")}>
              {t(`overview.cards.${card.key}`)}
            </p>
            <p className={mx(styles, "admin-hero-metric-value")}>
              {card.value.toLocaleString(locale)}
            </p>
          </Link>
        ))}
      </section>

      <AdminOverviewCharts
        signups={metrics.series.signups14d}
        active={metrics.series.active14d}
        roles={metrics.breakdowns.roles.map((item) => ({
          ...item,
          label:
            item.key === "tester"
              ? t("users.roles.tester")
              : item.key === "admin"
                ? t("users.roles.admin")
                : t("users.roles.user"),
        }))}
        content={metrics.breakdowns.content.map((item) => ({
          ...item,
          label: t(`modules.${item.key}`),
          href: `/admin/content/${item.key}`,
        }))}
        labels={{
          signupsTitle: t("overview.charts.signupsTitle"),
          signupsLede: t("overview.charts.signupsLede"),
          activeTitle: t("overview.charts.activeTitle"),
          activeLede: t("overview.charts.activeLede"),
          rolesTitle: t("overview.charts.rolesTitle"),
          rolesLede: t("overview.charts.rolesLede"),
          contentTitle: t("overview.charts.contentTitle"),
          contentLede: t("overview.charts.contentLede"),
        }}
      />

      <section
        className={mx(styles, "admin-ops-strip")}
        aria-label={t("overview.groups.ops")}
      >
        {ops.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className={mx(
              styles,
              "admin-ops-chip",
              card.tone === "warn" && "is-warn",
              card.tone === "accent" && "is-accent",
            )}
          >
            <span>{t(`overview.cards.${card.key}`)}</span>
            <strong>{card.value.toLocaleString(locale)}</strong>
          </Link>
        ))}
      </section>

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <div>
            <h2 className={mx(styles, "admin-panel-title")}>
              {t("overview.recentAudit")}
            </h2>
            <p className={mx(styles, "admin-panel-lede")}>
              {t("overview.recentAuditLede")}
            </p>
          </div>
          <Link href="/admin/audit" className={mx(styles, "admin-text-link")}>
            {t("overview.viewAllAudit")}
          </Link>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <AdminDataTable
            empty={t("audit.empty")}
            rowKey={(row) => row.id}
            rows={recent}
            columns={[
              {
                key: "createdAt",
                header: t("audit.columns.when"),
                className: mx(styles, "admin-mono"),
                cell: (row) => formatAdminDate(row.createdAt, locale),
              },
              {
                key: "actor",
                header: t("audit.columns.actor"),
                cell: (row) => (
                  <span className={mx(styles, "admin-mono")}>
                    {row.actorEmail ?? row.actorUserId}
                  </span>
                ),
              },
              {
                key: "action",
                header: t("audit.columns.action"),
                className: mx(styles, "admin-mono"),
                cell: (row) => row.action,
              },
              {
                key: "entity",
                header: t("audit.columns.entity"),
                cell: (row) => (
                  <span className={mx(styles, "admin-mono")}>
                    {row.entityType}
                    {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ""}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
