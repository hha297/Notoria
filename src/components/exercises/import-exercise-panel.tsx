"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { ImportExercisePicker } from "@/components/exercises/import-exercise-picker";
import { ImportMaterialForm } from "@/components/exercises/import-material-form";
import { Button } from "@/components/ui/button";
import importStyles from "@/components/style/exercises/import.module.css";
import theoryStyles from "@/components/style/exercises/theory.module.css";
import { mx } from "@/lib/css-module";
import { planGrantsFeature } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import type { ExerciseImportListItem } from "@/lib/exercise-import/types";

type ImportExercisePanelProps = {
  imports: ExerciseImportListItem[];
};

export function ImportExercisePanel({ imports }: ImportExercisePanelProps) {
  const t = useTranslations("exercises.import");
  const tSources = useTranslations("exercises.sources");
  const tBilling = useTranslations("billing");
  const { openUpgrade, plan } = useProAccess();
  const locked = !planGrantsFeature(plan, "exercise_import");

  return (
    <div
      className={cn("relative", locked && "min-h-96")}
      data-exercise="import"
    >
      <div
        className={cn(
          "space-y-10",
          locked && "pointer-events-none select-none opacity-45 blur-[5px]",
        )}
        aria-hidden={locked || undefined}
      >
        <header
          className={mx(
            importStyles,
            "import-hero relative -mx-1 px-4 py-7 sm:px-6 sm:py-8",
          )}
        >
          <ImportDecor />
          <div className="relative max-w-2xl space-y-2">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {t("eyebrow")}
            </p>
            <h2 className="font-heading text-[1.65rem] font-bold tracking-tight text-pretty text-ink sm:text-[1.95rem]">
              {t("hubTitle")}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-ink/75 sm:text-[15px]">
              {tSources("importHint")}
            </p>
          </div>
        </header>

        <ImportMaterialForm />

        {imports.length > 0 ? (
          <ImportExercisePicker imports={imports} />
        ) : null}
      </div>

      {locked ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 sm:p-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-locked-title"
            aria-describedby="import-locked-desc"
            className="flex w-full max-w-sm flex-col items-center border border-hairline-cloud bg-background/92 px-6 py-8 text-center shadow-lg backdrop-blur-md"
          >
            <div className="mb-4 flex size-12 items-center justify-center border border-hairline-cloud bg-muted/50 text-muted-foreground">
              <Lock className="size-5" aria-hidden />
            </div>
            <p
              id="import-locked-title"
              className="font-heading text-lg font-semibold text-ink"
            >
              {tBilling("lockedTitle")}
            </p>
            <p
              id="import-locked-desc"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              {t("lockedDescription")}
            </p>
            <Button type="button" className="mt-5" onClick={openUpgrade}>
              {t("unlockPro")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ImportDecor() {
  return (
    <div aria-hidden className={mx(theoryStyles, "theory-decor")}>
      <span
        className={mx(
          theoryStyles,
          "theory-blob top-[-28%] left-[-8%] size-40 bg-(--exercise-accent)",
        )}
      />
      <span
        className={mx(
          theoryStyles,
          "theory-blob right-[-10%] bottom-[-36%] size-36 bg-module-writing-fg",
        )}
      />
      <span
        className={mx(
          theoryStyles,
          "theory-diamond top-6 right-8 text-module-listen-fg",
        )}
      />
    </div>
  );
}

export function ImportExercisePanelLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="space-y-10"
      data-exercise="import"
    >
      <div className={mx(importStyles, "import-hero h-32 w-full")} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-16 bg-(--module-exercise-bg)/50" />
        ))}
      </div>
      <div className={mx(importStyles, "import-stage h-56 w-full")} />
    </div>
  );
}
