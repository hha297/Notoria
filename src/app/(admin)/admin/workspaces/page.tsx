import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import styles from "@/components/style/admin/admin.module.css";
import { buildAdminListHref, formatAdminDate } from "@/lib/admin/format";
import { listAdminWorkspaces } from "@/lib/admin/workspaces";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string; userId?: string }>;
};

export default async function AdminWorkspacesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const [t, locale, data] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    listAdminWorkspaces({
      q: params.q,
      page: params.page,
      userId: params.userId,
    }),
  ]);

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("nav.admin")}
        title={t("workspaces.title")}
        description={t("workspaces.description")}
      />

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <AdminSearchForm
            action="/admin/workspaces"
            placeholder={t("workspaces.searchPlaceholder")}
            defaultQuery={params.q ?? ""}
            searchLabel={t("common.search")}
            clearLabel={t("common.clear")}
            clearHref={buildAdminListHref("/admin/workspaces", {
              userId: params.userId,
            })}
            hiddenFields={{ userId: params.userId }}
          />
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <AdminDataTable
            empty={t("workspaces.empty")}
            rowKey={(row) => row.id}
            rows={data.rows}
            columns={[
              {
                key: "name",
                header: t("workspaces.columns.name"),
                cell: (row) => (
                  <Link href={`/admin/workspaces/${row.id}`}>{row.name}</Link>
                ),
              },
              {
                key: "language",
                header: t("workspaces.columns.language"),
                cell: (row) => row.language,
              },
              {
                key: "owner",
                header: t("workspaces.columns.owner"),
                cell: (row) => (
                  <div>
                    <Link href={`/admin/users/${row.userId}`}>
                      {row.ownerName}
                    </Link>
                    <div className={mx(styles, "admin-muted")}>
                      {row.ownerEmail}
                    </div>
                  </div>
                ),
              },
              {
                key: "updated",
                header: t("workspaces.columns.updated"),
                cell: (row) => formatAdminDate(row.updatedAt, locale),
              },
            ]}
          />
          <AdminPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            buildHref={(page) =>
              buildAdminListHref("/admin/workspaces", {
                q: params.q,
                userId: params.userId,
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
