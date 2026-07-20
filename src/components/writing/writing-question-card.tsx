"use client";

import type { ReactNode } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WritingQuestion } from "@/lib/writing/content";
import { cn } from "@/lib/utils";

type WritingQuestionCardProps = {
  question: WritingQuestion;
  index: number;
  canDelete: boolean;
  dragHandle: ReactNode;
  onChange: (question: WritingQuestion) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  className?: string;
};

export function WritingQuestionCard({
  question,
  index,
  canDelete,
  dragHandle,
  onChange,
  onDuplicate,
  onDelete,
  className,
}: WritingQuestionCardProps) {
  const t = useTranslations("writing");

  return (
    <div
      className={cn(
        "rounded-xl border border-hairline-cloud bg-background p-3 sm:p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {dragHandle}
        <p className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("question")} {index + 1}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDuplicate}
          aria-label={t("duplicateQuestion")}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label={t("deleteQuestion")}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`prompt-${question.id}`}>{t("prompt")}</Label>
          <Textarea
            id={`prompt-${question.id}`}
            value={question.prompt}
            onChange={(event) =>
              onChange({ ...question, prompt: event.target.value })
            }
            placeholder={t("promptPlaceholder")}
            className="min-h-18"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`example-${question.id}`}>
            {t("exampleAnswer")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </Label>
          <Textarea
            id={`example-${question.id}`}
            value={question.exampleAnswer}
            onChange={(event) =>
              onChange({ ...question, exampleAnswer: event.target.value })
            }
            placeholder={t("exampleAnswerPlaceholder")}
            className="min-h-14"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`notes-${question.id}`}>
            {t("notes")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </Label>
          <Textarea
            id={`notes-${question.id}`}
            value={question.notes}
            onChange={(event) =>
              onChange({ ...question, notes: event.target.value })
            }
            placeholder={t("notesPlaceholder")}
            className="min-h-12"
          />
        </div>
      </div>
    </div>
  );
}

export function QuestionDragHandle({
  attributes,
  listeners,
}: {
  attributes: DraggableAttributes;
  listeners?: SyntheticListenerMap;
}) {
  const t = useTranslations("writing");

  return (
    <button
      type="button"
      className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      {...attributes}
      {...listeners}
      aria-label={t("dragQuestion")}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
