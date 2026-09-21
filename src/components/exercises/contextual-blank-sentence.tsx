"use client";

import {
  applyAnswerFormCasing,
  splitPromptAtBlank,
} from "@/lib/exercises/blank-hint";
import { cn } from "@/lib/utils";

/**
 * Study-language sentence with a visual underline slot, matching Fill in the Blank.
 * The blank stays as an underline before submit; after submit the extracted form sits on it.
 */
export function ContextualBlankSentence({
  prompt,
  meaningHint,
  fill,
  revealed,
  isCorrect,
  className,
}: {
  prompt: string;
  meaningHint?: string | null;
  fill?: string | null;
  revealed: boolean;
  isCorrect: boolean;
  className?: string;
}) {
  const split = splitPromptAtBlank(prompt);
  const cue = meaningHint?.trim() || null;
  const slotText =
    revealed && fill?.trim()
      ? applyAnswerFormCasing(prompt, fill)
      : "\u00a0";

  if (!split) {
    return <p className={className}>{prompt}</p>;
  }

  return (
    <p className={className}>
      {split.before}
      <span
        className={cn(
          "inline-block min-w-[5.5rem] border-b-2 px-1 text-center font-medium",
          revealed
            ? isCorrect
              ? "border-success text-success"
              : "border-error text-error"
            : "border-(--exercise-accent) text-(--exercise-accent)",
        )}
      >
        {slotText}
      </span>
      {cue ? (
        <span className="font-medium text-muted-foreground"> ({cue})</span>
      ) : null}
      {split.after}
    </p>
  );
}
