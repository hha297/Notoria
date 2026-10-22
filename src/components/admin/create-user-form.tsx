"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "@/components/style/admin/admin.module.css";
import { adminCreateUser } from "@/lib/actions/admin/users";
import { mx } from "@/lib/css-module";

export function CreateUserForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await adminCreateUser({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        });
        router.push(`/admin/users/${result.id}`);
        router.refresh();
      } catch (err) {
        const code = err instanceof Error ? err.message : "UNKNOWN";
        setError(t(`errors.${code}` as "errors.UNKNOWN"));
      }
    });
  }

  return (
    <div className={mx(styles, "admin-create-card")}>
      <div>
        <h2 className={mx(styles, "admin-panel-title")}>
          {t("users.create.title")}
        </h2>
        <p className={mx(styles, "admin-panel-lede")}>
          {t("users.create.lede")}
        </p>
      </div>

      <div className={mx(styles, "admin-form-grid", "cols-2")}>
        <div className={mx(styles, "admin-field")}>
          <Label htmlFor="admin-create-name">{t("users.fields.name")}</Label>
          <Input
            id="admin-create-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            maxLength={80}
            autoComplete="off"
          />
        </div>
        <div className={mx(styles, "admin-field")}>
          <Label htmlFor="admin-create-email">{t("users.fields.email")}</Label>
          <Input
            id="admin-create-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            autoComplete="off"
          />
        </div>
        <div className={mx(styles, "admin-field")}>
          <Label htmlFor="admin-create-password">
            {t("users.fields.password")}
          </Label>
          <Input
            id="admin-create-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            autoComplete="new-password"
          />
        </div>
        <div className={mx(styles, "admin-field")}>
          <Label htmlFor="admin-create-role">{t("users.fields.role")}</Label>
          <Select
            value={role}
            disabled={pending}
            onValueChange={(next) => {
              if (next) setRole(next as UserRole);
            }}
          >
            <SelectTrigger
              id="admin-create-role"
              size="sm"
              aria-label={t("users.fields.role")}
              className={mx(styles, "admin-select-trigger")}
            >
              <SelectValue>
                {role === "ADMIN"
                  ? t("users.roles.admin")
                  : role === "TESTER"
                    ? t("users.roles.tester")
                    : t("users.roles.user")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={mx(styles, "admin-select-content")}>
              <SelectItem
                value="USER"
                className={mx(styles, "admin-select-item")}
              >
                {t("users.roles.user")}
              </SelectItem>
              <SelectItem
                value="TESTER"
                className={mx(styles, "admin-select-item")}
              >
                {t("users.roles.tester")}
              </SelectItem>
              <SelectItem
                value="ADMIN"
                className={mx(styles, "admin-select-item")}
              >
                {t("users.roles.admin")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={mx(styles, "admin-actions")}>
        <Button
          type="button"
          size="sm"
          disabled={
            pending ||
            name.trim().length < 2 ||
            email.trim().length < 3 ||
            password.length < 8
          }
          onClick={onSubmit}
        >
          {t("users.actions.create")}
        </Button>
      </div>

      {error ? <p className={mx(styles, "admin-badge-warn")}>{error}</p> : null}
    </div>
  );
}
