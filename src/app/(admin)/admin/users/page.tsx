import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminRoleBadge } from "@/components/admin/admin-role-badge";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import { AdminUsersFilters } from "@/components/admin/admin-users-filters";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { Badge } from "@/components/ui/badge";
import styles from "@/components/style/admin/admin.module.css";
import { buildAdminListHref, formatAdminDate } from "@/lib/admin/format";
import { listAdminUsers } from "@/lib/admin/users";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    role?: string;
    status?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const [t, locale, data] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    listAdminUsers({
      q: params.q,
      page: params.page,
      role: params.role,
      status: params.status,
    }),
  ]);

  const baseParams = {
    q: params.q,
    role: params.role,
    status: params.status,
  };

  function roleLabel(role: string) {
    if (role === "ADMIN") return t("users.roles.admin");
    if (role === "TESTER") return t("users.roles.tester");
    return t("users.roles.user");
  }

  function planLabel(plan: string) {
    if (plan === "premium") return t("users.plans.premium");
    if (plan === "pro") return t("users.plans.pro");
    if (plan === "free") return t("users.plans.free");
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("nav.admin")}
        title={t("users.title")}
        description={t("users.description")}
      />

      <CreateUserForm />

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <div className={mx(styles, "admin-toolbar")}>
            <AdminSearchForm
              action="/admin/users"
              placeholder={t("users.searchPlaceholder")}
              defaultQuery={params.q ?? ""}
              searchLabel={t("common.search")}
              clearLabel={t("common.clear")}
              clearHref={buildAdminListHref("/admin/users", {
                role: params.role,
                status: params.status,
              })}
              hiddenFields={{
                role: params.role,
                status: params.status,
              }}
            />
            <AdminUsersFilters
              q={params.q}
              role={params.role}
              status={params.status}
            />
          </div>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <AdminDataTable
            empty={t("users.empty")}
            rowKey={(row) => row.id}
            rows={data.rows}
            columns={[
              {
                key: "user",
                header: t("users.columns.user"),
                cell: (row) => (
                  <div>
                    <Link href={`/admin/users/${row.id}`}>{row.name}</Link>
                    <div className={mx(styles, "admin-mono", "admin-muted")}>
                      {row.email}
                    </div>
                  </div>
                ),
              },
              {
                key: "role",
                header: t("users.columns.role"),
                cell: (row) => (
                  <AdminRoleBadge role={row.role} label={roleLabel(row.role)} />
                ),
              },
              {
                key: "status",
                header: t("users.columns.status"),
                cell: (row) =>
                  row.suspendedAt ? (
                    <Badge variant="destructive">
                      {t("users.status.suspended")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t("users.status.active")}</Badge>
                  ),
              },
              {
                key: "plan",
                header: t("users.columns.plan"),
                className: mx(styles, "admin-mono"),
                cell: (row) => planLabel(row.subscriptionPlan),
              },
              {
                key: "workspaces",
                header: t("users.columns.workspaces"),
                className: mx(styles, "admin-mono"),
                cell: (row) => row.workspaceCount,
              },
              {
                key: "created",
                header: t("users.columns.created"),
                className: mx(styles, "admin-mono"),
                cell: (row) => formatAdminDate(row.createdAt, locale),
              },
            ]}
          />
          <AdminPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            buildHref={(page) =>
              buildAdminListHref("/admin/users", { ...baseParams, page })
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
