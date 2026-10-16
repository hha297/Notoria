"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import styles from "@/components/style/admin/admin.module.css";
import { adminDeleteContent } from "@/lib/actions/admin/content";
import type { AdminContentModule } from "@/lib/admin/content-modules";
import { mx } from "@/lib/css-module";

type ContentAdminActionsProps = {
  module: AdminContentModule;
  id: string;
};

export function ContentAdminActions({ module, id }: ContentAdminActionsProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
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
      {error ? <p className={mx(styles, "admin-badge-warn")}>{error}</p> : null}
    </div>
  );
}
