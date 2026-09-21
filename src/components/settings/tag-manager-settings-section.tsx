"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TagManagerDialog } from "@/components/vocabulary/tag-manager-dialog";
import styles from "@/components/style/settings/settings.module.css";
import { mx } from "@/lib/css-module";

type TagManagerSettingsSectionProps = {
  workspaceId: string | null;
};

export function TagManagerSettingsSection({
  workspaceId,
}: TagManagerSettingsSectionProps) {
  const t = useTranslations("settings.tagManager");
  const [open, setOpen] = useState(false);

  return (
    <>
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
              <p className={mx(styles, "settings-row-hint")}>
                {t("description")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="route-quiet-action"
              data-route-action="settings"
              disabled={!workspaceId}
              onClick={() => setOpen(true)}
            >
              <Tags className="size-4" />
              {t("open")}
            </Button>
          </div>
        </div>
      </section>

      {workspaceId ? (
        <TagManagerDialog
          open={open}
          onOpenChange={setOpen}
          workspaceId={workspaceId}
        />
      ) : null}
    </>
  );
}
