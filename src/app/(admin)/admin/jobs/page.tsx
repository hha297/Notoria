import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import styles from "@/components/style/admin/admin.module.css";
import { buildAdminListHref, formatAdminDate } from "@/lib/admin/format";
import { countAdminJobBuckets, listAdminJobs } from "@/lib/admin/jobs";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string; kind?: string }>;
};

export default async function AdminJobsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const [t, locale, data, buckets] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    listAdminJobs({
      q: params.q,
      page: params.page,
      kind: params.kind,
    }),
    countAdminJobBuckets(),
  ]);

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("nav.admin")}
        title={t("jobs.title")}
        description={t("jobs.description")}
      />

      <section className={mx(styles, "admin-metrics")}>
        {(
          [
            ["runningLocks", buckets.runningLocks],
            ["failedLocks", buckets.failedLocks],
            ["failedListening", buckets.failedListening],
            ["failedImports", buckets.failedImports],
          ] as const
        ).map(([key, value]) => (
          <article key={key} className={mx(styles, "admin-metric")}>
            <p className={mx(styles, "admin-metric-label")}>
              {t(`jobs.buckets.${key}`)}
            </p>
            <p className={mx(styles, "admin-metric-value")}>{value}</p>
          </article>
        ))}
      </section>

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <div className={mx(styles, "admin-toolbar")}>
            <AdminSearchForm
              action="/admin/jobs"
              placeholder={t("jobs.searchPlaceholder")}
              defaultQuery={params.q ?? ""}
              searchLabel={t("common.search")}
              clearLabel={t("common.clear")}
              clearHref={buildAdminListHref("/admin/jobs", {
                kind: params.kind,
              })}
              hiddenFields={{ kind: params.kind }}
            />
            <form method="get" action="/admin/jobs" className="flex gap-2">
              {params.q ? (
                <input type="hidden" name="q" value={params.q} />
              ) : null}
              <select
                name="kind"
                defaultValue={params.kind ?? ""}
                className="h-8 rounded-md border border-page-accent-border control-surface px-2 text-sm"
                aria-label={t("jobs.filters.kind")}
              >
                <option value="">{t("jobs.filters.allKinds")}</option>
                <option value="ai_lock">{t("jobs.kinds.ai_lock")}</option>
                <option value="listening">{t("jobs.kinds.listening")}</option>
                <option value="exercise_import">
                  {t("jobs.kinds.exercise_import")}
                </option>
              </select>
              <button
                type="submit"
                className="h-8 rounded-md border border-page-accent-border px-3 text-sm font-semibold"
              >
                {t("common.filter")}
              </button>
            </form>
          </div>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <AdminDataTable
            empty={t("jobs.empty")}
            rowKey={(row) => `${row.kind}:${row.id}`}
            rows={data.rows}
            columns={[
              {
                key: "kind",
                header: t("jobs.columns.kind"),
                cell: (row) => t(`jobs.kinds.${row.kind}`),
              },
              {
                key: "title",
                header: t("jobs.columns.title"),
                cell: (row) =>
                  row.kind === "listening" ? (
                    <Link href={`/admin/content/listening/${row.id}`}>
                      {row.title}
                    </Link>
                  ) : (
                    row.title
                  ),
              },
              {
                key: "status",
                header: t("jobs.columns.status"),
                cell: (row) => row.status,
              },
              {
                key: "error",
                header: t("jobs.columns.error"),
                cell: (row) => row.errorCode ?? "—",
              },
              {
                key: "owner",
                header: t("jobs.columns.owner"),
                cell: (row) =>
                  row.userId && row.ownerEmail ? (
                    <Link href={`/admin/users/${row.userId}`}>
                      {row.ownerEmail}
                    </Link>
                  ) : (
                    (row.workspaceName ?? "—")
                  ),
              },
              {
                key: "updated",
                header: t("jobs.columns.updated"),
                cell: (row) => formatAdminDate(row.updatedAt, locale),
              },
            ]}
          />
          <AdminPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            buildHref={(page) =>
              buildAdminListHref("/admin/jobs", {
                q: params.q,
                kind: params.kind,
                page,
              })
            }
            labels={{
              previous: t("common.previous"),
              next: t("common.next"),
              pageOf: t("common.pageOf", {
                page: data.page,
                totalPages: data.totalPages,
              }),
              results: t("common.results", { total: data.total }),
            }}
          />
        </div>
      </section>
    </div>
  );
}
