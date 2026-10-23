"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/components/style/admin/admin.module.css";
import {
  adminDeleteUser,
  adminSetUserRole,
  adminSetUserSuspended,
  adminUpdateUserProfile,
} from "@/lib/actions/admin/users";
import { mx } from "@/lib/css-module";

type UserAdminActionsProps = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  suspended: boolean;
  isSelf: boolean;
};

export function UserAdminActions({
  userId,
  name: initialName,
  email: initialEmail,
  role,
  suspended,
  isSelf,
}: UserAdminActionsProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);

  function run(
    action: () => Promise<unknown>,
    options?: { redirectTo?: string },
  ) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        if (options?.redirectTo) {
          router.push(options.redirectTo);
          router.refresh();
          return;
        }
        router.refresh();
      } catch (err) {
        const code = err instanceof Error ? err.message : "UNKNOWN";
        setError(t(`errors.${code}` as "errors.UNKNOWN"));
      }
    });
  }

  function setRole(
    next: UserRole,
    confirmKey: "grantAdmin" | "revokeAdmin" | "grantTester" | "revokeTester",
  ) {
    if (!window.confirm(t(`users.confirm.${confirmKey}`))) return;
    run(() => adminSetUserRole({ userId, role: next }));
  }

  return (
    <div className="grid gap-4">
      <div className={mx(styles, "admin-form-grid", "cols-2")}>
        <div className={mx(styles, "admin-field")}>
          <Label htmlFor="admin-user-name">{t("users.fields.name")}</Label>
          <Input
            id="admin-user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            maxLength={80}
          />
        </div>
        <div className={mx(styles, "admin-field")}>
          <Label htmlFor="admin-user-email">{t("users.fields.email")}</Label>
          <Input
            id="admin-user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>
      <div className={mx(styles, "admin-actions")}>
        <Button
          type="button"
          size="sm"
          disabled={
            pending ||
            name.trim().length < 2 ||
            email.trim().length < 3
          }
          onClick={() =>
            run(() =>
              adminUpdateUserProfile({
                userId,
                name: name.trim(),
                email: email.trim(),
              }),
            )
          }
        >
          {t("users.actions.saveProfile")}
        </Button>
      </div>

      <div className={mx(styles, "admin-role-actions")}>
        <p className={mx(styles, "admin-section-label")}>
          {t("users.fields.role")}
        </p>
        <div className={mx(styles, "admin-actions")}>
          {role === "ADMIN" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || isSelf}
              onClick={() => setRole("USER", "revokeAdmin")}
            >
              {t("users.actions.revokeAdmin")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setRole("ADMIN", "grantAdmin")}
            >
              {t("users.actions.grantAdmin")}
            </Button>
          )}

          {role === "TESTER" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || isSelf}
              onClick={() => setRole("USER", "revokeTester")}
            >
              {t("users.actions.revokeTester")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || isSelf}
              onClick={() => setRole("TESTER", "grantTester")}
            >
              {t("users.actions.grantTester")}
            </Button>
          )}
        </div>
        <p className={mx(styles, "admin-muted")}>{t("users.roleHelp")}</p>
      </div>

      <div className={mx(styles, "admin-danger-zone")}>
        <p className={mx(styles, "admin-section-label")}>
          {t("users.detail.danger")}
        </p>
        <div className={mx(styles, "admin-actions")}>
          {suspended ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || isSelf}
              onClick={() => {
                if (!window.confirm(t("users.confirm.restore"))) return;
                run(() =>
                  adminSetUserSuspended({ userId, suspended: false }),
                );
              }}
            >
              {t("users.actions.restore")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || isSelf}
              onClick={() => {
                if (!window.confirm(t("users.confirm.suspend"))) return;
                run(() => adminSetUserSuspended({ userId, suspended: true }));
              }}
            >
              {t("users.actions.suspend")}
            </Button>
          )}

          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending || isSelf}
            onClick={() => {
              if (!window.confirm(t("users.confirm.delete"))) return;
              run(() => adminDeleteUser({ userId }), {
                redirectTo: "/admin/users",
              });
            }}
          >
            {t("users.actions.delete")}
          </Button>
        </div>
      </div>

      {isSelf ? (
        <p className={mx(styles, "admin-muted")}>{t("users.selfGuard")}</p>
      ) : null}
      {error ? <p className={mx(styles, "admin-badge-warn")}>{error}</p> : null}
    </div>
  );
}
