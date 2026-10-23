import Link from "next/link";
import { Input } from "@/components/ui/input";
import styles from "@/components/style/admin/admin.module.css";
import { mx } from "@/lib/css-module";

type AdminSearchFormProps = {
  action: string;
  placeholder: string;
  defaultQuery?: string;
  searchLabel: string;
  clearLabel?: string;
  clearHref?: string;
  hiddenFields?: Record<string, string | undefined>;
};

export function AdminSearchForm({
  action,
  placeholder,
  defaultQuery = "",
  searchLabel,
  clearLabel,
  clearHref,
  hiddenFields,
}: AdminSearchFormProps) {
  return (
    <form method="get" action={action} className={mx(styles, "admin-search")}>
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) =>
            value ? (
              <input key={name} type="hidden" name={name} value={value} />
            ) : null,
          )
        : null}
      <Input
        name="q"
        type="search"
        defaultValue={defaultQuery}
        placeholder={placeholder}
        aria-label={searchLabel}
      />
      <button type="submit" className={mx(styles, "admin-btn")}>
        {searchLabel}
      </button>
      {clearHref && defaultQuery && clearLabel ? (
        <Link href={clearHref} className={mx(styles, "admin-btn", "admin-btn-ghost")}>
          {clearLabel}
        </Link>
      ) : null}
    </form>
  );
}
