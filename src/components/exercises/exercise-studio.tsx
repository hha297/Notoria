"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Layers, Upload } from "lucide-react";
import { ExerciseTypePicker } from "@/components/exercises/exercise-type-picker";
import { ImportExercisePanel } from "@/components/exercises/import-exercise-panel";
import { TheoryExercisePicker } from "@/components/exercises/theory-exercise-picker";
import type { TheoryExerciseCardItem } from "@/components/exercises/theory-exercise-picker";
import type { ExerciseImportListItem } from "@/lib/exercise-import/types";
import { cn } from "@/lib/utils";

type StudioSource = "vocabulary" | "theory" | "import";

type ExerciseStudioProps = {
  theories: TheoryExerciseCardItem[];
  imports?: ExerciseImportListItem[];
  defaultSource?: StudioSource;
};

export function ExerciseStudio({
  theories,
  imports = [],
  defaultSource = "vocabulary",
}: ExerciseStudioProps) {
  const t = useTranslations("exercises");
  const [source, setSource] = useState<StudioSource>(defaultSource);

  const tabs = useMemo(
    () =>
      [
        {
          id: "vocabulary" as const,
          label: t("sources.vocabulary"),
          icon: Layers,
        },
        {
          id: "theory" as const,
          label: t("sources.theory"),
          icon: BookOpen,
        },
        {
          id: "import" as const,
          label: t("sources.import"),
          icon: Upload,
        },
      ] as const,
    [t],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div
          role="tablist"
          aria-label={t("sources.label")}
          className="inline-flex max-w-full flex-wrap rounded-xl border border-hairline-cloud bg-muted/30 p-1"
          data-tutorial="exercise-sources"
        >
          {tabs.map((tab) => {
            const active = source === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSource(tab.id)}
                className={cn(
                  "inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-3.5",
                  active
                    ? "bg-card text-ink shadow-sm ring-1 ring-hairline-cloud"
                    : "text-muted-foreground hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {source === "theory" ? (
          <Link
            href="/theory"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            {t("theory.openLibrary")}
          </Link>
        ) : null}
      </div>

      <div role="tabpanel">
        {source === "vocabulary" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("sources.vocabularyHint")}</p>
            <ExerciseTypePicker />
          </div>
        ) : source === "theory" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("sources.theoryHint")}</p>
            <TheoryExercisePicker theories={theories} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("sources.importHint")}</p>
            <ImportExercisePanel imports={imports} />
          </div>
        )}
      </div>
    </div>
  );
}
