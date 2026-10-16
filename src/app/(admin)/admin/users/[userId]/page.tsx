import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserAdminActions } from "@/components/admin/user-admin-actions";
import { WorkspaceAdminActions } from "@/components/admin/workspace-admin-actions";
import { Badge } from "@/components/ui/badge";
import styles from "@/components/style/admin/admin.module.css";
import { formatAdminDate } from "@/lib/admin/format";
import { getAdminUserDetail } from "@/lib/admin/users";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { userId } = await params;
  const [t, locale, detail] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    getAdminUserDetail(userId),
  ]);

  if (!detail) notFound();

  const { user, counts, workspaces } = detail;

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("users.title")}
        title={user.name}
        description={user.email}
        actions={
          <Link href="/admin/users" className="text-sm font-semibold underline">
            {t("common.backToList")}
          </Link>
        }
      />

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <h2 className={mx(styles, "admin-panel-title")}>
            {t("users.detail.account")}
          </h2>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <dl className={mx(styles, "admin-dl")}>
            <dt>{t("users.fields.id")}</dt>
            <dd className={mx(styles, "admin-mono")}>{user.id}</dd>
            <dt>{t("users.fields.role")}</dt>
            <dd>{user.role}</dd>
            <dt>{t("users.fields.status")}</dt>
            <dd>
              {user.suspendedAt ? (
                <Badge variant="destructive">{t("users.status.suspended")}</Badge>
              ) : (
                <Badge variant="secondary">{t("users.status.active")}</Badge>
              )}
            </dd>
            <dt>{t("users.fields.plan")}</dt>
            <dd>
              {user.subscriptionPlan}
              {user.subscriptionStatus ? ` · ${user.subscriptionStatus}` : ""}
            </dd>
            <dt>{t("users.fields.created")}</dt>
            <dd>{formatAdminDate(user.createdAt, locale)}</dd>
            <dt>{t("users.fields.updated")}</dt>
            <dd>{formatAdminDate(user.updatedAt, locale)}</dd>
            <dt>{t("users.fields.emailVerified")}</dt>
            <dd>{formatAdminDate(user.emailVerified, locale)}</dd>
          </dl>
        </div>
      </section>

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <h2 className={mx(styles, "admin-panel-title")}>
            {t("users.detail.usage")}
          </h2>
          <p className={mx(styles, "admin-panel-lede")}>
            {t("users.detail.usageLede")}
          </p>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <div className={mx(styles, "admin-metrics")}>
            {(
              [
                "workspaces",
                "vocabulary",
                "theory",
                "writing",
                "listening",
                "reading",
                "speaking",
                "inbox",
              ] as const
            ).map((key) => (
              <article key={key} className={mx(styles, "admin-metric")}>
                <p className={mx(styles, "admin-metric-label")}>
                  {t(`overview.cards.${key}`)}
                </p>
                <p className={mx(styles, "admin-metric-value")}>{counts[key]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <h2 className={mx(styles, "admin-panel-title")}>
            {t("users.detail.actions")}
          </h2>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <UserAdminActions
            userId={user.id}
            name={user.name}
            role={user.role}
            suspended={Boolean(user.suspendedAt)}
            isSelf={admin.id === user.id}
          />
        </div>
      </section>

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <div>
            <h2 className={mx(styles, "admin-panel-title")}>
              {t("users.detail.workspaces")}
            </h2>
            <p className={mx(styles, "admin-panel-lede")}>
              {t("users.detail.workspacesLede")}
            </p>
          </div>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          {workspaces.length === 0 ? (
            <p className={mx(styles, "admin-empty")}>{t("workspaces.empty")}</p>
          ) : (
            <ul className="grid gap-2">
              {workspaces.map((ws) => (
                <li key={ws.id}>
                  <Link
                    href={`/admin/workspaces/${ws.id}`}
                    className="font-semibold underline"
                  >
                    {ws.name}
                  </Link>
                  <span className={mx(styles, "admin-muted")}>
                    {" "}
                    · {ws.language} · {formatAdminDate(ws.createdAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-hairline-cloud pt-4">
            <h3 className="mb-2 font-heading text-sm font-semibold">
              {t("workspaces.createForUser")}
            </h3>
            <WorkspaceAdminActions mode="create" ownerUserId={user.id} />
          </div>
        </div>
      </section>
    </div>
  );
}
