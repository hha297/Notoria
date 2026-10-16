import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
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

  const cards = [
    {
      key: "users",
      value: metrics.totals.users,
      hint: null as string | null,
      href: "/admin/users",
    },
    {
      key: "newUsers7d",
      value: metrics.totals.newUsers7d,
      hint: metrics.ranges.newUsers7d,
      href: "/admin/users",
    },
    {
      key: "newUsers30d",
      value: metrics.totals.newUsers30d,
      hint: metrics.ranges.newUsers30d,
      href: "/admin/users",
    },
    {
      key: "activeUsers7d",
      value: metrics.totals.activeUsers7d,
      hint: metrics.ranges.activeUsers7d,
      href: "/admin/users",
    },
    {
      key: "workspaces",
      value: metrics.totals.workspaces,
      hint: null,
      href: "/admin/workspaces",
    },
    {
      key: "vocabulary",
      value: metrics.totals.vocabulary,
      hint: null,
      href: "/admin/content/vocabulary",
    },
    {
      key: "theory",
      value: metrics.totals.theory,
      hint: null,
      href: "/admin/content/theory",
    },
    {
      key: "writing",
      value: metrics.totals.writing,
      hint: null,
      href: "/admin/content/writing",
    },
    {
      key: "exercises",
      value: metrics.totals.exercises,
      hint: null,
      href: "/admin/content/exercises",
    },
    {
      key: "listening",
      value: metrics.totals.listening,
      hint: null,
      href: "/admin/content/listening",
    },
    {
      key: "reading",
      value: metrics.totals.reading,
      hint: null,
      href: "/admin/content/reading",
    },
    {
      key: "speaking",
      value: metrics.totals.speaking,
      hint: null,
      href: "/admin/content/speaking",
    },
    {
      key: "inbox",
      value: metrics.totals.inbox,
      hint: null,
      href: "/admin/content/inbox",
    },
    {
      key: "runningJobs",
      value: metrics.totals.runningJobs,
      hint: null,
      href: "/admin/jobs",
    },
    {
      key: "failedListening",
      value: metrics.totals.failedListening,
      hint: null,
      href: "/admin/jobs?kind=listening",
    },
    {
      key: "failedImports",
      value: metrics.totals.failedImports,
      hint: null,
      href: "/admin/jobs?kind=exercise_import",
    },
    {
      key: "recentAudits7d",
      value: metrics.totals.recentAudits7d,
      hint: metrics.ranges.recentAudits7d,
      href: "/admin/audit",
    },
  ] as const;

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("nav.admin")}
        title={t("overview.title")}
        description={t("overview.description")}
      />

      <section className={mx(styles, "admin-metrics")} aria-label={t("overview.metrics")}>
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className={mx(styles, "admin-metric")}
          >
            <p className={mx(styles, "admin-metric-label")}>
              {t(`overview.cards.${card.key}`)}
            </p>
            <p className={mx(styles, "admin-metric-value")}>{card.value}</p>
            {card.hint ? (
              <p className={mx(styles, "admin-metric-hint")}>{card.hint}</p>
            ) : null}
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
          <Link href="/admin/audit" className="text-sm font-semibold underline">
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
                cell: (row) => formatAdminDate(row.createdAt, locale),
              },
              {
                key: "actor",
                header: t("audit.columns.actor"),
                cell: (row) => row.actorEmail ?? row.actorUserId,
              },
              {
                key: "action",
                header: t("audit.columns.action"),
                cell: (row) => row.action,
              },
              {
                key: "entity",
                header: t("audit.columns.entity"),
                cell: (row) =>
                  `${row.entityType}${row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}`,
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
