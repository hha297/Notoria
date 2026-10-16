"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  role: "USER" | "ADMIN";
  suspended: boolean;
  isSelf: boolean;
};

export function UserAdminActions({
  userId,
  name: initialName,
  role,
  suspended,
  isSelf,
}: UserAdminActionsProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
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

  return (
    <div className="grid gap-4">
      <div className={mx(styles, "admin-form-grid")}>
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
        <div className={mx(styles, "admin-actions")}>
          <Button
            type="button"
            size="sm"
            disabled={pending || name.trim().length < 2}
            onClick={() =>
              run(() => adminUpdateUserProfile({ userId, name: name.trim() }))
            }
          >
            {t("users.actions.saveProfile")}
          </Button>
        </div>
      </div>

      <div className={mx(styles, "admin-actions")}>
        {role === "ADMIN" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || isSelf}
            onClick={() => {
              if (!window.confirm(t("users.confirm.revokeAdmin"))) return;
              run(() => adminSetUserRole({ userId, role: "USER" }));
            }}
          >
            {t("users.actions.revokeAdmin")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("users.confirm.grantAdmin"))) return;
              run(() => adminSetUserRole({ userId, role: "ADMIN" }));
            }}
          >
            {t("users.actions.grantAdmin")}
          </Button>
        )}

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

      {isSelf ? (
        <p className={mx(styles, "admin-muted")}>{t("users.selfGuard")}</p>
      ) : null}
      {error ? <p className={mx(styles, "admin-badge-warn")}>{error}</p> : null}
    </div>
  );
}
