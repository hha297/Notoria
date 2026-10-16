import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      <Button type="submit" variant="outline" size="sm">
        {searchLabel}
      </Button>
      {clearHref && defaultQuery && clearLabel ? (
        <Button render={<Link href={clearHref} />} variant="ghost" size="sm">
          {clearLabel}
        </Button>
      ) : null}
    </form>
  );
}
