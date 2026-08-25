"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Layers } from "lucide-react";
import { ExerciseTypePicker } from "@/components/exercises/exercise-type-picker";
import { TheoryExercisePicker } from "@/components/exercises/theory-exercise-picker";
import type { TheoryExerciseCardItem } from "@/components/exercises/theory-exercise-picker";
import { cn } from "@/lib/utils";

type StudioSource = "vocabulary" | "theory";

type ExerciseStudioProps = {
  theories: TheoryExerciseCardItem[];
  defaultSource?: StudioSource;
};

export function ExerciseStudio({
  theories,
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
      ] as const,
    [t],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div
          role="tablist"
          aria-label={t("sources.label")}
          className="inline-flex w-fit rounded-xl border border-hairline-cloud bg-muted/30 p-1"
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
                  "inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-card text-ink shadow-sm ring-1 ring-hairline-cloud"
                    : "text-muted-foreground hover:text-ink",
                )}
              >
                <Icon className="size-4 opacity-80" />
                {tab.label}
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
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("sources.theoryHint")}</p>
            <TheoryExercisePicker theories={theories} />
          </div>
        )}
      </div>
    </div>
  );
}
