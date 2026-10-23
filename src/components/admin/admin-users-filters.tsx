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

type AdminUsersFiltersProps = {
  q?: string;
  role?: string;
  status?: string;
};

export function AdminUsersFilters({
  q,
  role: initialRole = "",
  status: initialStatus = "",
}: AdminUsersFiltersProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(initialRole || "all");
  const [status, setStatus] = useState(initialStatus || "all");

  const roleOptions = [
    { value: "all", label: t("users.filters.allRoles") },
    { value: "USER", label: t("users.roles.user") },
    { value: "TESTER", label: t("users.roles.tester") },
    { value: "ADMIN", label: t("users.roles.admin") },
  ] as const;

  const statusOptions = [
    { value: "all", label: t("users.filters.allStatuses") },
    { value: "active", label: t("users.status.active") },
    { value: "suspended", label: t("users.status.suspended") },
  ] as const;

  function apply(nextRole: string, nextStatus: string) {
    startTransition(() => {
      router.push(
        buildAdminListHref("/admin/users", {
          q,
          role: nextRole === "all" ? undefined : nextRole,
          status: nextStatus === "all" ? undefined : nextStatus,
        }),
      );
    });
  }

  const roleLabel =
    roleOptions.find((option) => option.value === role)?.label ??
    t("users.filters.allRoles");
  const statusLabel =
    statusOptions.find((option) => option.value === status)?.label ??
    t("users.filters.allStatuses");

  return (
    <div className={mx(styles, "admin-filter-form")}>
      <Select
        value={role}
        disabled={pending}
        onValueChange={(next) => {
          if (!next) return;
          setRole(next);
          apply(next, status);
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label={t("users.filters.role")}
          className={mx(styles, "admin-select-trigger", "admin-select-compact")}
        >
          <SelectValue>{roleLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className={mx(styles, "admin-select-content")}>
          {roleOptions.map((option) => (
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

      <Select
        value={status}
        disabled={pending}
        onValueChange={(next) => {
          if (!next) return;
          setStatus(next);
          apply(role, next);
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label={t("users.filters.status")}
          className={mx(styles, "admin-select-trigger", "admin-select-compact")}
        >
          <SelectValue>{statusLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className={mx(styles, "admin-select-content")}>
          {statusOptions.map((option) => (
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
