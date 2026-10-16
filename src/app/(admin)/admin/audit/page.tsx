import { getLocale, getTranslations } from "next-intl/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import styles from "@/components/style/admin/admin.module.css";
import { listAdminAuditEvents } from "@/lib/admin/audit-list";
import { buildAdminListHref, formatAdminDate } from "@/lib/admin/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const [t, locale, data] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    listAdminAuditEvents({ q: params.q, page: params.page }),
  ]);

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("nav.admin")}
        title={t("audit.title")}
        description={t("audit.description")}
      />

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <AdminSearchForm
            action="/admin/audit"
            placeholder={t("audit.searchPlaceholder")}
            defaultQuery={params.q ?? ""}
            searchLabel={t("common.search")}
            clearLabel={t("common.clear")}
            clearHref="/admin/audit"
          />
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <AdminDataTable
            empty={t("audit.empty")}
            rowKey={(row) => row.id}
            rows={data.rows}
            columns={[
              {
                key: "when",
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
                  `${row.entityType}${
                    row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""
                  }`,
              },
              {
                key: "success",
                header: t("audit.columns.success"),
                cell: (row) =>
                  row.success ? t("audit.success.yes") : t("audit.success.no"),
              },
            ]}
          />
          <AdminPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            buildHref={(page) =>
              buildAdminListHref("/admin/audit", { q: params.q, page })
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
