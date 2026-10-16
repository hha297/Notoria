import Link from "next/link";
import { Button } from "@/components/ui/button";
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
          <Button render={<Link href={prev} />} variant="outline" size="sm">
            {labels.previous}
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {labels.previous}
          </Button>
        )}
        {next ? (
          <Button render={<Link href={next} />} variant="outline" size="sm">
            {labels.next}
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {labels.next}
          </Button>
        )}
      </div>
    </div>
  );
}
