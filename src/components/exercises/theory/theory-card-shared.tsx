"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SkillHeader({
  skillLabel,
  instruction,
  fallbackType,
  fallbackInstruction,
}: {
  skillLabel?: string;
  instruction?: string;
  fallbackType: string;
  fallbackInstruction: string;
}) {
  const title = skillLabel?.trim() || fallbackType;
  const task = instruction?.trim() || fallbackInstruction;

  return (
    <div className="mb-5 min-w-0 space-y-2">
      <p className="break-words text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="break-words text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">
        {task}
      </p>
    </div>
  );
}

export function HintText({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return <p className="break-words [overflow-wrap:anywhere]">{text}</p>;
}

export function FeedbackRow({
  correct,
  message,
  onNext,
  nextLabel,
}: {
  correct: boolean;
  message: string;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div
      className={cn(
        "mt-5 flex min-w-0 flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        correct ? "bg-[#f4fae0]" : "bg-[#fff1f6]",
      )}
    >
      <p
        className={cn(
          "inline-flex min-w-0 flex-1 items-start gap-2 text-sm font-medium break-words [overflow-wrap:anywhere]",
          correct ? "text-[#4a6b0a]" : "text-destructive",
        )}
      >
        {correct ? (
          <Check className="mt-0.5 size-4 shrink-0" />
        ) : (
          <X className="mt-0.5 size-4 shrink-0" />
        )}
        <span className="min-w-0">{message}</span>
      </p>
      <Button type="button" onClick={onNext} className="w-full shrink-0 sm:w-auto">
        {nextLabel}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
