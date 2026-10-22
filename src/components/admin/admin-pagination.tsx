import Link from "next/link";
import styles from "@/components/style/admin/admin.module.css";
import { mx } from "@/lib/css-module";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  buildHref: (page: number) => string;
  labels: {
    previous: string;
    next: string;
    /** Already interpolated, e.g. t("common.pageOf", { page, totalPages }) */
    pageOf: string;
    /** Already interpolated, e.g. t("common.results", { total }) */
    results: string;
  };
};

export function AdminPagination({
  page,
  totalPages,
  total,
  buildHref,
  labels,
}: AdminPaginationProps) {
  if (total === 0) return null;

  const prev = page > 1 ? buildHref(page - 1) : null;
  const next = page < totalPages ? buildHref(page + 1) : null;

  return (
    <div className={mx(styles, "admin-pagination")}>
      <p className={mx(styles, "admin-pagination-meta")}>
        {labels.results}
        <span aria-hidden> · </span>
        {labels.pageOf}
      </p>
      <div className={mx(styles, "admin-pagination-controls")}>
        {prev ? (
          <Link href={prev} className={mx(styles, "admin-btn", "admin-btn-ghost")}>
            {labels.previous}
          </Link>
        ) : (
          <button type="button" className={mx(styles, "admin-btn", "admin-btn-ghost")} disabled>
            {labels.previous}
          </button>
        )}
        {next ? (
          <Link href={next} className={mx(styles, "admin-btn", "admin-btn-ghost")}>
            {labels.next}
          </Link>
        ) : (
          <button type="button" className={mx(styles, "admin-btn", "admin-btn-ghost")} disabled>
            {labels.next}
          </button>
        )}
      </div>
    </div>
  );
}
