"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LanguageSelect } from "@/components/shared/language-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/components/style/admin/admin.module.css";
import {
  adminCreateWorkspace,
  adminDeleteWorkspace,
  adminUpdateWorkspace,
} from "@/lib/actions/admin/workspaces";
import { WORKPLACE_LANGUAGES } from "@/lib/languages";
import { mx } from "@/lib/css-module";

type WorkspaceAdminActionsProps =
  | {
      mode: "edit";
      workspaceId: string;
      name: string;
      language: string;
      ownerUserId?: never;
    }
  | {
      mode: "create";
      ownerUserId: string;
      workspaceId?: never;
      name?: never;
      language?: never;
    };

export function WorkspaceAdminActions(props: WorkspaceAdminActionsProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(
    props.mode === "edit" ? props.name : "",
  );
  const [language, setLanguage] = useState(
    props.mode === "edit" ? props.language : WORKPLACE_LANGUAGES[0]?.code ?? "en",
  );
  const [error, setError] = useState<string | null>(null);

  function run(
    action: () => Promise<{ id?: string } | { ok: true }>,
    options?: { redirectTo?: string },
  ) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (options?.redirectTo) {
          router.push(options.redirectTo);
        } else if (props.mode === "create" && "id" in result && result.id) {
          router.push(`/admin/workspaces/${result.id}`);
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
      <div className={mx(styles, "admin-form-grid", "cols-2")}>
        <div className={mx(styles, "admin-field")}>
          <Label htmlFor="admin-ws-name">{t("workspaces.fields.name")}</Label>
          <Input
            id="admin-ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            maxLength={80}
            placeholder={
              props.mode === "create"
                ? t("workspaces.fields.nameOptional")
                : undefined
            }
          />
        </div>
        <div className={mx(styles, "admin-field")}>
          <Label htmlFor="admin-ws-lang">{t("workspaces.fields.language")}</Label>
          <LanguageSelect
            id="admin-ws-lang"
            value={language}
            onValueChange={setLanguage}
            disabled={pending}
            aria-label={t("workspaces.fields.language")}
          />
        </div>
      </div>

      <div className={mx(styles, "admin-actions")}>
        {props.mode === "create" ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() =>
                adminCreateWorkspace({
                  userId: props.ownerUserId,
                  language,
                  name: name.trim() || undefined,
                }),
              )
            }
          >
            {t("workspaces.actions.create")}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              disabled={pending || name.trim().length < 1}
              onClick={() =>
                run(() =>
                  adminUpdateWorkspace({
                    workspaceId: props.workspaceId,
                    name: name.trim(),
                    language,
                  }),
                )
              }
            >
              {t("workspaces.actions.save")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(t("workspaces.confirm.delete"))) return;
                run(
                  () =>
                    adminDeleteWorkspace({ workspaceId: props.workspaceId }),
                  { redirectTo: "/admin/workspaces" },
                );
              }}
            >
              {t("workspaces.actions.delete")}
            </Button>
          </>
        )}
      </div>

      {error ? <p className={mx(styles, "admin-badge-warn")}>{error}</p> : null}
    </div>
  );
}
