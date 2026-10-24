"use client";

import { Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import styles from "@/components/style/settings/settings.module.css";
import { mx } from "@/lib/css-module";

type TagManagerSettingsSectionProps = {
  workspaceId: string | null;
};

export function TagManagerSettingsSection({
  workspaceId,
}: TagManagerSettingsSectionProps) {
  const t = useTranslations("settings.tagManager");

  return (
    <section
      className={mx(styles, "settings-panel")}
      aria-labelledby="settings-tag-manager"
    >
      <header className={mx(styles, "settings-panel-head")}>
        <h2
          id="settings-tag-manager"
          className={mx(styles, "settings-panel-title")}
        >
          {t("sectionTitle")}
        </h2>
        <p className={mx(styles, "settings-panel-lede")}>
          {t("sectionDescription")}
        </p>
      </header>
      <div className={mx(styles, "settings-panel-body settings-prefs")}>
        <div className={mx(styles, "settings-row settings-row-action")}>
          <div className={mx(styles, "settings-row-copy")}>
            <p className={mx(styles, "settings-row-title")}>{t("title")}</p>
            <p className={mx(styles, "settings-row-hint")}>{t("description")}</p>
          </div>
          <LinkButton
            href={workspaceId ? "/tag?from=/settings" : "/tag"}
            variant="outline"
            className="route-quiet-action"
            data-route-action="settings"
            aria-disabled={!workspaceId}
            tabIndex={workspaceId ? undefined : -1}
            onClick={(event) => {
              if (!workspaceId) event.preventDefault();
            }}
          >
            <Tags className="size-4" />
            {t("open")}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
