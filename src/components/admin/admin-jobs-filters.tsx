"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "@/components/style/admin/admin.module.css";
import { buildAdminListHref } from "@/lib/admin/format";
import { mx } from "@/lib/css-module";

type AdminJobsFiltersProps = {
  q?: string;
  kind?: string;
};

export function AdminJobsFilters({
  q,
  kind: initialKind = "",
}: AdminJobsFiltersProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState(initialKind || "all");

  const kindOptions = [
    { value: "all", label: t("jobs.filters.allKinds") },
    { value: "ai_lock", label: t("jobs.kinds.ai_lock") },
    { value: "listening", label: t("jobs.kinds.listening") },
    { value: "exercise_import", label: t("jobs.kinds.exercise_import") },
  ] as const;

  const kindLabel =
    kindOptions.find((option) => option.value === kind)?.label ??
    t("jobs.filters.allKinds");

  return (
    <div className={mx(styles, "admin-filter-form")}>
      <Select
        value={kind}
        disabled={pending}
        onValueChange={(next) => {
          if (!next) return;
          setKind(next);
          startTransition(() => {
            router.push(
              buildAdminListHref("/admin/jobs", {
                q,
                kind: next === "all" ? undefined : next,
              }),
            );
          });
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label={t("jobs.filters.kind")}
          className={mx(styles, "admin-select-trigger", "admin-select-compact")}
        >
          <SelectValue>{kindLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className={mx(styles, "admin-select-content")}>
          {kindOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={mx(styles, "admin-select-item")}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
