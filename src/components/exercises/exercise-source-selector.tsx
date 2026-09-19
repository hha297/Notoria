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
    {
      id: "vocabulary" as const,
      label: t("sources.vocabulary"),
      count: t("sources.vocabularyCount", { count: vocabularyCount }),
    },
    {
      id: "theory" as const,
      label: t("sources.theory"),
      count: t("sources.theoryCount", { count: theoryCount }),
    },
    {
      id: "import" as const,
      label: t("sources.imported"),
      count: t("sources.importCount", { count: importCount }),
    },
  ];

  return (
    <div className="space-y-3" data-tutorial="exercise-sources">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        <span className="truncate">{workspaceName}</span>
        <span aria-hidden> · </span>
        {t("sources.label")}
      </p>

      <div
        role="tablist"
        aria-label={t("sources.label")}
        className="grid grid-cols-3 border-b border-hairline-cloud"
      >
        {tabs.map((tab) => {
          const active = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`studio-tab-${tab.id}`}
              aria-controls={`studio-panel-${tab.id}`}
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative min-w-0 cursor-pointer px-2 py-2.5 text-left transition-colors sm:px-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active ? "text-ink" : "text-muted-foreground hover:text-ink",
              )}
            >
              <span className="block truncate text-sm font-semibold">{tab.label}</span>
              <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                {tab.count}
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors sm:inset-x-3",
                  active ? "bg-ink" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
