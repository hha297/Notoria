import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import styles from "@/components/style/admin/admin.module.css";
import { listAdminContent } from "@/lib/admin/content";
import {
  ADMIN_CONTENT_MODULES,
  isAdminContentModule,
} from "@/lib/admin/content-modules";
import { buildAdminListHref, formatAdminDate } from "@/lib/admin/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

type PageProps = {
  params: Promise<{ module: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    userId?: string;
    workspaceId?: string;
    status?: string;
  }>;
};

export default async function AdminContentModulePage({
  params,
  searchParams,
}: PageProps) {
  await requireAdmin();
  const { module: moduleParam } = await params;
  if (!isAdminContentModule(moduleParam)) notFound();
  const contentModule = moduleParam;
  const query = await searchParams;

  const [t, locale, data] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    listAdminContent(contentModule, {
      q: query.q,
      page: query.page,
      userId: query.userId,
      workspaceId: query.workspaceId,
      status: query.status,
    }),
  ]);

  const basePath = `/admin/content/${contentModule}`;

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("nav.content")}
        title={t(`modules.${contentModule}`)}
        description={t("content.description")}
      />

      <nav className={mx(styles, "admin-content-modules")} aria-label={t("nav.content")}>
        {ADMIN_CONTENT_MODULES.map((m) => (
          <Link
            key={m}
            href={`/admin/content/${m}`}
            className={mx(
              styles,
              "admin-content-module",
              m === contentModule && "is-active",
            )}
          >
            {t(`modules.${m}`)}
          </Link>
        ))}
      </nav>

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <AdminSearchForm
            action={basePath}
            placeholder={t("content.searchPlaceholder")}
            defaultQuery={query.q ?? ""}
            searchLabel={t("common.search")}
            clearLabel={t("common.clear")}
            clearHref={buildAdminListHref(basePath, {
              userId: query.userId,
              workspaceId: query.workspaceId,
              status: query.status,
            })}
            hiddenFields={{
              userId: query.userId,
              workspaceId: query.workspaceId,
              status: query.status,
            }}
          />
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <AdminDataTable
            empty={t("content.empty")}
            rowKey={(row) => row.id}
            rows={data.rows}
            columns={[
              {
                key: "title",
                header: t("content.columns.title"),
                cell: (row) => (
                  <Link href={`${basePath}/${row.id}`}>{row.title}</Link>
                ),
              },
              {
                key: "status",
                header: t("content.columns.status"),
                cell: (row) =>
                  "status" in row && row.status != null ? String(row.status) : "—",
              },
              {
                key: "owner",
                header: t("content.columns.owner"),
                cell: (row) => (
                  <Link href={`/admin/users/${row.userId}`}>
                    {row.ownerEmail}
                  </Link>
                ),
              },
              {
                key: "workspace",
                header: t("content.columns.workspace"),
                cell: (row) => (
                  <Link href={`/admin/workspaces/${row.workspaceId}`}>
                    {row.workspaceName}
                  </Link>
                ),
              },
              {
                key: "updated",
                header: t("content.columns.updated"),
                cell: (row) => formatAdminDate(row.updatedAt, locale),
              },
            ]}
          />
          <AdminPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            buildHref={(page) =>
              buildAdminListHref(basePath, {
                q: query.q,
                userId: query.userId,
                workspaceId: query.workspaceId,
                status: query.status,
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
