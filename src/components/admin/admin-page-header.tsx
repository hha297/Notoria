import type { ReactNode } from "react";
import styles from "@/components/style/admin/admin.module.css";
import { mx } from "@/lib/css-module";

type AdminPageHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className={mx(styles, "admin-page-header")}>
      <div>
        {kicker ? (
          <p className={mx(styles, "admin-page-kicker")}>{kicker}</p>
        ) : null}
        <h1 className={mx(styles, "admin-page-title")}>{title}</h1>
        {description ? (
          <p className={mx(styles, "admin-page-lede")}>{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className={mx(styles, "admin-page-actions")}>{actions}</div>
      ) : null}
    </header>
  );
}
