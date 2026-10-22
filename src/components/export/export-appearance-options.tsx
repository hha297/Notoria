"use client";

import { useTheme } from "next-themes";
import { useMemo, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import styles from "@/components/style/export/export-format.module.css";
import { mx } from "@/lib/css-module";
import {
  DEFAULT_EXPORT_APPEARANCE,
  resolveExportTheme,
  type ExportAppearance,
  type PrintSurface,
} from "@/lib/export/print-theme";
import { cn } from "@/lib/utils";

type ExportAppearanceOptionsProps = {
  idPrefix: string;
  value: ExportAppearance;
  onChange: (appearance: ExportAppearance) => void;
  surface: PrintSurface;
  /** Show Word-specific background note when DOCX is selected. */
  showDocxNote?: boolean;
};

const OPTIONS: ExportAppearance[] = ["print", "theme"];

export function ExportAppearanceOptions({
  idPrefix,
  value,
  onChange,
  surface,
  showDocxNote = false,
}: ExportAppearanceOptionsProps) {
  const t = useTranslations("common.exportAppearance");
  const { resolvedTheme } = useTheme();

  const previewTheme = useMemo(
    () =>
      resolveExportTheme(
        value,
        surface,
        resolvedTheme === "dark" ? "dark" : "light",
      ),
    [value, surface, resolvedTheme],
  );

  return (
    <div className="space-y-3">
      <div
        className={mx(styles, "export-format-grid")}
        role="radiogroup"
        aria-label={t("label")}
        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
      >
        {OPTIONS.map((option) => {
          const selected = value === option;
          const id = `${idPrefix}-${option}`;
          return (
            <button
              key={option}
              id={id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={mx(
                styles,
                "export-format-chip",
                selected && "is-active",
              )}
              onClick={() => onChange(option)}
            >
              <span className={mx(styles, "export-format-name")}>
                {option === "print" ? t("print") : t("theme")}
              </span>
              <span className={mx(styles, "export-format-hint")}>
                {option === "print" ? t("printHint") : t("themeHint")}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={mx(styles, "export-appearance-preview")}
        style={
          {
            "--export-preview-paper": previewTheme.paper,
            "--export-preview-ink": previewTheme.ink,
            "--export-preview-muted": previewTheme.muted,
            "--export-preview-accent": previewTheme.accent,
            "--export-preview-wash": previewTheme.wash,
            "--export-preview-hairline": previewTheme.hairline,
        } as CSSProperties
      }
        data-export-appearance={value}
        data-export-mode={previewTheme.mode}
      >
        <p className={mx(styles, "export-appearance-preview-kicker")}>
          {t("previewKicker")}
        </p>
        <p className={mx(styles, "export-appearance-preview-title")}>
          {t("previewTitle")}
        </p>
        <p className={mx(styles, "export-appearance-preview-body")}>
          {t("previewBody")}
        </p>
        <div className={mx(styles, "export-appearance-preview-callout")}>
          {t("previewCallout")}
        </div>
      </div>

      <p className={cn("text-xs leading-relaxed text-muted-foreground")}>
        {t("fixedNote")}
        {showDocxNote ? ` ${t("docxBackgroundNote")}` : null}
      </p>
    </div>
  );
}

export { DEFAULT_EXPORT_APPEARANCE };
