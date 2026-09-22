"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import exerciseStyles from "@/components/style/listening/exercise.module.css";
import { mx } from "@/lib/css-module";
import {
  asStringArray,
  fillBlankDisplayText,
} from "@/lib/listening/practice-session";
import { listeningAnswersMatch } from "@/lib/listening/practice";
import type { ListeningExerciseClient } from "@/lib/listening/types";
import {
  fillBlankDataSchema,
  multipleChoiceDataSchema,
} from "@/schemas/listening";

function withSentenceLineBreaks(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  // Keep intentional paragraph gaps from source; collapse excess.
  if (/\n/.test(normalized)) {
    return normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }

  // One sentence per line for readability.
  return normalized
    .replace(/([.!?])(["”']?)(\s+)/g, "$1$2\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

type FillBlankProps = {
  exercise: ListeningExerciseClient;
  answer: string[];
  checked: boolean;
  onChange: (value: string[]) => void;
};

export function ListeningFillBlankQuestion({
  exercise,
  answer,
  checked,
  onChange,
}: FillBlankProps) {
  const t = useTranslations("listening.practice");
  const data = fillBlankDataSchema.safeParse(exercise.data);
  const speaker = data.success ? data.data.speaker : undefined;
  const displayText = withSentenceLineBreaks(fillBlankDisplayText(exercise));
  const blanks = asStringArray(exercise.correctAnswer);
  const parts = displayText.split(/_{3,}/);
  const blankResults = blanks.map((item, index) =>
    listeningAnswersMatch(answer[index] ?? "", item),
  );

  function update(index: number, value: string) {
    const next = blanks.map((_, blankIndex) => answer[blankIndex] ?? "");
    next[index] = value;
    onChange(next);
  }

  return (
    <div>
      {speaker ? (
        <p className={mx(exerciseStyles, "questionLabel")}>{speaker}</p>
      ) : null}
      <div className={mx(exerciseStyles, "passage")}>
        {parts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < blanks.length ? (
              <span className={mx(exerciseStyles, "blank")}>
                <Input
                  value={answer[index] ?? ""}
                  onChange={(event) => update(index, event.target.value)}
                  disabled={checked}
                  aria-label={t("blankLabel", { number: index + 1 })}
                  style={{
                    width: `${Math.min(
                      22,
                      Math.max(8, (blanks[index]?.length ?? 6) + 2),
                    )}ch`,
                  }}
                  className={mx(exerciseStyles, "blankInput")}
                  data-state={
                    checked
                      ? blankResults[index]
                        ? "correct"
                        : "wrong"
                      : undefined
                  }
                />
                {checked && !blankResults[index] ? (
                  <span className={mx(exerciseStyles, "blankHint")}>
                    ({blanks[index]})
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

type MultipleChoiceProps = {
  exercise: ListeningExerciseClient;
  index: number;
  answer: string | null;
  checked: boolean;
  onChange: (value: string) => void;
};

export function ListeningMultipleChoiceQuestion({
  exercise,
  index,
  answer,
  checked,
  onChange,
}: MultipleChoiceProps) {
  const t = useTranslations("listening.practice");
  const data = multipleChoiceDataSchema.safeParse(exercise.data);
  const options = data.success ? data.data.options : [];
  const correct = String(exercise.correctAnswer ?? "");

  return (
    <div className="flex flex-col gap-3">
      <p className={mx(exerciseStyles, "questionLabel")}>
        {t("questionLabel", { number: index + 1 })}
      </p>
      <p className={mx(exerciseStyles, "prompt")}>{exercise.question}</p>
      <div className={mx(exerciseStyles, "options")} role="radiogroup">
        {options.map((option) => {
          const selected = Boolean(
            answer && listeningAnswersMatch(answer, option),
          );
          const isCorrect = listeningAnswersMatch(option, correct);
          let state: "correct" | "wrong" | undefined;
          if (checked && isCorrect) state = "correct";
          if (checked && selected && !isCorrect) state = "wrong";

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={checked}
              data-selected={selected ? "true" : "false"}
              data-checked={checked ? "true" : "false"}
              data-state={state}
              onClick={() => onChange(option)}
              className={mx(exerciseStyles, "option")}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
