"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/components/style/admin/admin.module.css";
import {
  adminDeleteContent,
  adminUpdateContent,
} from "@/lib/actions/admin/content";
import type { AdminContentModule } from "@/lib/admin/content-modules";
import { mx } from "@/lib/css-module";

type ContentAdminActionsProps = {
  module: AdminContentModule;
  id: string;
  title: string;
};

export function ContentAdminActions({
  module,
  id,
  title: initialTitle,
}: ContentAdminActionsProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const canEditTitle = module !== "inbox";

  return (
    <div className="grid gap-4">
      {canEditTitle ? (
        <div className={mx(styles, "admin-form-grid")}>
          <div className={mx(styles, "admin-field")}>
            <Label htmlFor="admin-content-title">
              {module === "vocabulary"
                ? t("content.fields.word")
                : module === "folders"
                  ? t("content.fields.folderName")
                  : t("content.fields.title")}
            </Label>
            <Input
              id="admin-content-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
              maxLength={200}
            />
          </div>
          <div className={mx(styles, "admin-actions")}>
            <Button
              type="button"
              size="sm"
              disabled={pending || title.trim().length < 1}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await adminUpdateContent({
                      module,
                      id,
                      title: title.trim(),
                    });
                    router.refresh();
                  } catch (err) {
                    const code =
                      err instanceof Error ? err.message : "UNKNOWN";
                    setError(t(`errors.${code}` as "errors.UNKNOWN"));
                  }
                });
              }}
            >
              {t("content.actions.saveTitle")}
            </Button>
          </div>
        </div>
      ) : (
        <p className={mx(styles, "admin-muted")}>
          {t("content.inboxEditNote")}
        </p>
      )}

      <div className={mx(styles, "admin-danger-zone")}>
        <div className={mx(styles, "admin-actions")}>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("content.confirm.delete"))) return;
              setError(null);
              startTransition(async () => {
                try {
                  await adminDeleteContent({ module, id });
                  router.push(`/admin/content/${module}`);
                  router.refresh();
                } catch (err) {
                  const code = err instanceof Error ? err.message : "UNKNOWN";
                  setError(t(`errors.${code}` as "errors.UNKNOWN"));
                }
              });
            }}
          >
            {t("content.actions.delete")}
          </Button>
        </div>
        {module === "listening" ? (
          <p className={mx(styles, "admin-muted")}>
            {t("content.listeningMediaNote")}
          </p>
        ) : null}
      </div>

      {error ? <p className={mx(styles, "admin-badge-warn")}>{error}</p> : null}
    </div>
  );
}
