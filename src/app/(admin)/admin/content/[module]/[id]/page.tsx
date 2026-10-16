import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ContentAdminActions } from "@/components/admin/content-admin-actions";
import styles from "@/components/style/admin/admin.module.css";
import { getAdminContentDetail } from "@/lib/admin/content";
import { isAdminContentModule } from "@/lib/admin/content-modules";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mx } from "@/lib/css-module";

type PageProps = {
  params: Promise<{ module: string; id: string }>;
};

export default async function AdminContentDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { module: moduleParam, id } = await params;
  if (!isAdminContentModule(moduleParam)) notFound();

  const [t, locale, row] = await Promise.all([
    getTranslations("admin"),
    getLocale(),
    getAdminContentDetail(moduleParam, id),
  ]);

  if (!row) notFound();

  return (
    <div className={mx(styles, "admin-page")}>
      <AdminPageHeader
        kicker={t(`modules.${moduleParam}`)}
        title={row.title}
        description={t("content.detail.description")}
        actions={
          <Link
            href={`/admin/content/${moduleParam}`}
            className="text-sm font-semibold underline"
          >
            {t("common.backToList")}
          </Link>
        }
      />

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <h2 className={mx(styles, "admin-panel-title")}>
            {t("content.detail.meta")}
          </h2>
          <p className={mx(styles, "admin-panel-lede")}>
            {t("content.detail.metaLede")}
          </p>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <dl className={mx(styles, "admin-dl")}>
            <dt>{t("content.fields.id")}</dt>
            <dd className={mx(styles, "admin-mono")}>{row.id}</dd>
            <dt>{t("content.fields.status")}</dt>
            <dd>
              {"status" in row && row.status != null ? String(row.status) : "—"}
            </dd>
            {"errorCode" in row && row.errorCode ? (
              <>
                <dt>{t("content.fields.errorCode")}</dt>
                <dd>{String(row.errorCode)}</dd>
              </>
            ) : null}
            <dt>{t("content.fields.owner")}</dt>
            <dd>
              <Link
                href={`/admin/users/${row.userId}`}
                className="font-semibold underline"
              >
                {row.ownerEmail}
              </Link>
            </dd>
            <dt>{t("content.fields.workspace")}</dt>
            <dd>
              <Link
                href={`/admin/workspaces/${row.workspaceId}`}
                className="font-semibold underline"
              >
                {row.workspaceName}
              </Link>
            </dd>
            <dt>{t("content.fields.created")}</dt>
            <dd>{formatAdminDate(row.createdAt, locale)}</dd>
            <dt>{t("content.fields.updated")}</dt>
            <dd>{formatAdminDate(row.updatedAt, locale)}</dd>
          </dl>
        </div>
      </section>

      <section className={mx(styles, "admin-panel")}>
        <div className={mx(styles, "admin-panel-head")}>
          <h2 className={mx(styles, "admin-panel-title")}>
            {t("content.detail.actions")}
          </h2>
        </div>
        <div className={mx(styles, "admin-panel-body")}>
          <ContentAdminActions module={moduleParam} id={row.id} />
        </div>
      </section>
    </div>
  );
}
