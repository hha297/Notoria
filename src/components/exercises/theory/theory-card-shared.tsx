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
    <div className="mb-5 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="text-sm leading-relaxed text-ink">{task}</p>
    </div>
  );
}

export function HintText({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return <p>{text}</p>;
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
        "mt-5 flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        correct ? "bg-[#f4fae0]" : "bg-[#fff1f6]",
      )}
    >
      <p
        className={cn(
          "inline-flex items-center gap-2 text-sm font-medium",
          correct ? "text-[#4a6b0a]" : "text-destructive",
        )}
      >
        {correct ? <Check className="size-4" /> : <X className="size-4" />}
        {message}
      </p>
      <Button type="button" onClick={onNext} className="sm:w-auto">
        {nextLabel}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
