import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WorkspaceAdminActions } from "@/components/admin/workspace-admin-actions";
import styles from "@/components/style/admin/admin.module.css";
import { formatAdminDate } from "@/lib/admin/format";
import { getAdminWorkspaceDetail } from "@/lib/admin/workspaces";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function AdminWorkspaceDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { workspaceId } = await params;
  const [t, locale, workspace] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    getAdminWorkspaceDetail(workspaceId),
  ]);

  if (!workspace) notFound();

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t("workspaces.title")}
        title={workspace.name}
        description={t("workspaces.detail.description", {
          language: workspace.language,
        })}
        actions={
          <Link
            href="/admin/workspaces"
            className={mx(styles, "admin-text-link")}
          >
            {t("common.backToList")}
          </Link>
        }
      />

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <h2 className={mx(styles, "admin-panel-title")}>
            {t("workspaces.detail.meta")}
          </h2>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <dl className={mx(styles, "admin-dl")}>
            <dt>{t("workspaces.fields.id")}</dt>
            <dd className={mx(styles, "admin-mono")}>{workspace.id}</dd>
            <dt>{t("workspaces.fields.language")}</dt>
            <dd>{workspace.language}</dd>
            <dt>{t("workspaces.fields.owner")}</dt>
            <dd>
              <Link
                href={`/admin/users/${workspace.userId}`}
                className={mx(styles, "admin-text-link")}
              >
                {workspace.ownerName}
              </Link>
              <span className={mx(styles, "admin-muted")}>
                {" "}
                · {workspace.ownerEmail}
              </span>
            </dd>
            <dt>{t("workspaces.fields.created")}</dt>
            <dd>{formatAdminDate(workspace.createdAt, locale)}</dd>
            <dt>{t("workspaces.fields.updated")}</dt>
            <dd>{formatAdminDate(workspace.updatedAt, locale)}</dd>
          </dl>
        </div>
      </section>

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <h2 className={mx(styles, "admin-panel-title")}>
            {t("workspaces.detail.actions")}
          </h2>
          <p className={mx(styles, "admin-panel-lede")}>
            {t("workspaces.detail.actionsLede")}
          </p>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <WorkspaceAdminActions
            mode="edit"
            workspaceId={workspace.id}
            name={workspace.name}
            language={workspace.language}
          />
        </div>
      </section>
    </div>
  );
}
