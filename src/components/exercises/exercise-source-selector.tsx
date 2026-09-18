"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type StudioSource = "vocabulary" | "theory" | "import";

type ExerciseSourceSelectorProps = {
  value: StudioSource;
  onChange: (value: StudioSource) => void;
  workspaceName: string;
  vocabularyCount: number;
  theoryCount: number;
  importCount: number;
};

export function ExerciseSourceSelector({
  value,
  onChange,
  workspaceName,
  vocabularyCount,
  theoryCount,
  importCount,
}: ExerciseSourceSelectorProps) {
  const t = useTranslations("exercises");

  const tabs = [
    { id: "vocabulary" as const, label: t("sources.vocabulary") },
    { id: "theory" as const, label: t("sources.theory") },
    { id: "import" as const, label: t("sources.imported") },
  ];

  const countLabel =
    value === "vocabulary"
      ? t("sources.vocabularyCount", { count: vocabularyCount })
      : value === "theory"
        ? t("sources.theoryCount", { count: theoryCount })
        : t("sources.importCount", { count: importCount });

  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-hairline-cloud bg-surface-elevated px-3 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-4"
      data-tutorial="exercise-sources"
    >
      <div
        role="tablist"
        aria-label={t("sources.label")}
        className="flex min-w-0 flex-wrap gap-1"
      >
        {tabs.map((tab) => {
          const active = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <p className="min-w-0 text-xs leading-snug text-muted-foreground sm:ml-auto sm:text-right">
        <span className="block truncate font-medium text-ink">{workspaceName}</span>
        <span>
          {countLabel}
          <span aria-hidden> · </span>
          {t("sources.selected")} {tabs.find((tab) => tab.id === value)?.label}
        </span>
      </p>
    </div>
  );
}
