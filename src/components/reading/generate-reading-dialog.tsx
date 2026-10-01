"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { LanguageSelect } from "@/components/shared/language-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "@/components/style/workspace/sheet.module.css";
import { generateReadingQuestionSet } from "@/lib/actions/reading";
import { mx } from "@/lib/css-module";
import { isReadingErrorCode } from "@/lib/reading/errors";
import type { ReadingExerciseMode } from "@/lib/reading/types";
import { queryKeys } from "@/lib/query/keys";
import { WRITING_CEFR_LEVELS } from "@/lib/writing/meta";

type GenerateReadingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passageId: string;
  workspaceId: string;
  defaultLanguage: string;
};

const MODES: ReadingExerciseMode[] = [
  "multiple_choice",
  "written",
  "true_false_not_stated",
  "mixed",
];

const COUNTS = [5, 10, 15, 20] as const;
type QuestionCount = (typeof COUNTS)[number];

export function GenerateReadingDialog({
  open,
  onOpenChange,
  passageId,
  workspaceId,
  defaultLanguage,
}: GenerateReadingDialogProps) {
  const t = useTranslations("reading");
  const tBilling = useTranslations("billing");
  const tc = useTranslations("common");
  const { openUpgrade } = useProAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ReadingExerciseMode>("multiple_choice");
  const [count, setCount] = useState<QuestionCount>(5);
  const [questionLanguage, setQuestionLanguage] = useState(
    defaultLanguage || "en",
  );
  const [difficulty, setDifficulty] = useState("none");
  const [isPending, startTransition] = useTransition();

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    if (code === "AI_QUOTA_EXCEEDED") return tBilling("quotaExceeded");
    if (isReadingErrorCode(code)) {
      return t(`errors.${code}`);
    }
    return t("errors.PROCESSING_FAILED");
  }

  function handleGenerate() {
    startTransition(async () => {
      try {
        const set = await generateReadingQuestionSet({
          passageId,
          exerciseMode: mode,
          questionCount: count,
          questionLanguage,
          difficulty: difficulty === "none" ? null : difficulty,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.reading.detail(workspaceId, passageId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.reading.all(workspaceId),
        });
        onOpenChange(false);
        toast.success(t("exercisesGenerated"));
        router.push(`/reading/${passageId}/practice?set=${set.id}`);
        router.refresh();
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        toast.error(errorMessage(error));
        if (code === "AI_QUOTA_EXCEEDED") {
          openUpgrade();
        }
      }
    });
  }

  const difficultyLabel =
    difficulty === "none"
      ? t("difficultyNone")
      : difficulty.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={mx(
          styles,
          "workspace-sheet flex max-h-[min(92vh,40rem)] flex-col overflow-hidden sm:max-w-md",
        )}
        data-sheet-route="read"
      >
        <DialogHeader
          className={mx(
            styles,
            "workspace-sheet-header gap-2 space-y-0 pr-8 text-left",
          )}
        >
          <DialogTitle className={mx(styles, "workspace-sheet-title")}>
            {t("generateTitle")}
          </DialogTitle>
          <DialogDescription className={mx(styles, "workspace-sheet-desc")}>
            {t("generateDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className={mx(styles, "workspace-sheet-body grid gap-4")}>
          <div className={mx(styles, "workspace-sheet-field")}>
            <Label className={mx(styles, "workspace-sheet-label")}>
              {t("modeLabel")}
            </Label>
            <Select
              value={mode}
              onValueChange={(value) =>
                value && setMode(value as ReadingExerciseMode)
              }
            >
              <SelectTrigger
                className={mx(styles, "workspace-sheet-input w-full")}
              >
                <SelectValue>{t(`modes.${mode}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent
                className={mx(styles, "workspace-sheet-menu")}
                data-sheet-route="read"
              >
                {MODES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`modes.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={mx(styles, "workspace-sheet-field")}>
            <Label className={mx(styles, "workspace-sheet-label")}>
              {t("questionCountLabel")}
            </Label>
            <Select
              value={String(count)}
              onValueChange={(value) => {
                const next = Number(value) as QuestionCount;
                if (COUNTS.includes(next)) setCount(next);
              }}
            >
              <SelectTrigger
                className={mx(styles, "workspace-sheet-input w-full")}
              >
                <SelectValue>{count}</SelectValue>
              </SelectTrigger>
              <SelectContent
                className={mx(styles, "workspace-sheet-menu")}
                data-sheet-route="read"
              >
                {COUNTS.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={mx(styles, "workspace-sheet-field")}>
            <Label className={mx(styles, "workspace-sheet-label")}>
              {t("questionLanguageLabel")}
            </Label>
            <LanguageSelect
              value={questionLanguage}
              onValueChange={setQuestionLanguage}
              aria-label={t("questionLanguageLabel")}
            />
          </div>

          <div className={mx(styles, "workspace-sheet-field")}>
            <Label className={mx(styles, "workspace-sheet-label")}>
              {t("difficultyLabel")}
            </Label>
            <Select
              value={difficulty}
              onValueChange={(value) => value && setDifficulty(value)}
            >
              <SelectTrigger
                className={mx(styles, "workspace-sheet-input w-full")}
              >
                <SelectValue>{difficultyLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent
                className={mx(styles, "workspace-sheet-menu")}
                data-sheet-route="read"
              >
                <SelectItem value="none">{t("difficultyNone")}</SelectItem>
                {WRITING_CEFR_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className={mx(
            styles,
            "workspace-sheet-footer flex justify-end gap-2 pt-2",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            className="route-primary-cta"
            onClick={handleGenerate}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? t("generating") : t("generateExercises")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
