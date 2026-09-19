"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Button } from "@/components/ui/button";
import { ExerciseSessionPageFrame } from "@/components/exercises/exercise-session-page-frame";

export function FormSentenceLocked() {
  const t = useTranslations("exercises");
  const tBilling = useTranslations("billing");
  const { openUpgrade } = useProAccess();

  return (
    <ExerciseSessionPageFrame
      slug="form-sentence"
      title={t("types.form-sentence.label")}
      backLabel={t("backToStudio")}
    >
      <div className="empty-state">
        <div className="mb-4 flex size-14 items-center justify-center border border-hairline-cloud bg-muted/40 text-muted-foreground">
          <Lock className="size-6" />
        </div>
        <p className="font-medium text-ink">{tBilling("lockedTitle")}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {tBilling("lockedDescription")}
        </p>
        <Button className="mt-5" onClick={openUpgrade}>
          {tBilling("upgrade")}
        </Button>
      </div>
    </ExerciseSessionPageFrame>
  );
}
