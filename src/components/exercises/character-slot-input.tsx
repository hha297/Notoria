"use client";

import { useEffect, useRef, useState } from "react";
import sessionStyles from "@/components/style/exercises/session.module.css";
import { mx } from "@/lib/css-module";
import {
  editableAnswerCharacters,
  formatSlotValue,
  isSlotAnswerComplete,
  maximumAnswerSlotLength,
  slotDisplayParts,
} from "@/lib/exercises/character-slots";
import { cn } from "@/lib/utils";

export function CharacterSlotInput({
  value,
  answers,
  onChange,
  ariaLabel,
  name,
  autoFocus = false,
  className,
}: {
  value: string;
  answers: readonly string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  name?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const lastEmittedRef = useRef(value);
  const [shake, setShake] = useState(0);
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const enteredValue = editableAnswerCharacters(value).join("");
  const parts = slotDisplayParts(value, answers);
  const maximumLength = maximumAnswerSlotLength(answers);
  const complete = isSlotAnswerComplete(value, answers);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    lastEmittedRef.current = value;
    const input = inputRef.current;
    if (!input || composingRef.current) return;
    const current = editableAnswerCharacters(input.value).join("");
    if (current.normalize("NFC") === enteredValue) return;
    const start = input.selectionStart ?? enteredValue.length;
    const end = input.selectionEnd ?? start;
    input.value = enteredValue;
    input.setSelectionRange(
      Math.min(start, enteredValue.length),
      Math.min(end, enteredValue.length),
    );
  }, [enteredValue, value]);

  const rejectOverflow = () => setShake((current) => current + 1);

  const syncSelection = (input = inputRef.current) => {
    if (!input) return;
    setSelection({
      start: input.selectionStart ?? 0,
      end: input.selectionEnd ?? input.selectionStart ?? 0,
    });
  };

  const placeCaret = (position: number) => {
    const input = inputRef.current;
    if (!input) return;
    const next = Math.max(0, Math.min(position, enteredValue.length));
    input.focus();
    input.setSelectionRange(next, next);
    setSelection({ start: next, end: next });
  };

  const commitInputValue = (input: HTMLInputElement) => {
    const raw = input.value;
    const overflow = editableAnswerCharacters(raw).length > maximumLength;
    if (overflow) rejectOverflow();
    const formatted = formatSlotValue(raw, answers);
    const editable = editableAnswerCharacters(formatted).join("");

    if (overflow) {
      const cursor = input.selectionStart ?? editable.length;
      input.value = editable;
      input.setSelectionRange(
        Math.min(cursor, editable.length),
        Math.min(cursor, editable.length),
      );
    }

    if (formatted !== lastEmittedRef.current) {
      lastEmittedRef.current = formatted;
      onChange(formatted);
    }
  };

  return (
    <span
      data-complete={complete ? "true" : "false"}
      className={cn(
        "relative inline-flex max-w-full flex-wrap items-center gap-x-[0.2em] gap-y-1 rounded-sm px-0.5 align-middle focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--exercise-accent)/45",
        shake > 0 && mx(sessionStyles, "exercise-shake"),
        className,
      )}
      onAnimationEnd={() => setShake(0)}
      onClick={() => inputRef.current?.focus()}
    >
      {parts.map((part, index) => {
        if (!part.editable) {
          return /\s/u.test(part.character) ? (
            <span key={index} aria-hidden className="w-[0.48em]" />
          ) : (
            <span key={index} aria-hidden className="px-[0.02em] text-ink">
              {part.character}
            </span>
          );
        }

        const slotIndex = parts
          .slice(0, index)
          .filter((candidate) => candidate.editable).length;
        const selected =
          focused &&
          selection.start !== selection.end &&
          slotIndex >= selection.start &&
          slotIndex < selection.end;
        const showCaret =
          focused &&
          selection.start === selection.end &&
          selection.start === slotIndex;

        return (
          <span
            key={index}
            aria-hidden
            data-missing={part.entered ? undefined : "true"}
            onPointerDown={(event) => {
              event.preventDefault();
              const bounds = event.currentTarget.getBoundingClientRect();
              placeCaret(
                slotIndex +
                  (event.clientX >= bounds.left + bounds.width / 2 ? 1 : 0),
              );
            }}
            className={cn(
              "relative inline-flex size-[1.18em] shrink-0 items-center justify-center rounded-[0.18em] border text-[0.82em] leading-none font-semibold transition-[border-color,background-color,color,box-shadow]",
              part.entered
                ? "border-(--exercise-accent)/70 bg-(--exercise-accent-soft)/55 text-ink"
                : "border-dashed border-(--exercise-accent)/55 bg-(--exercise-accent)/7 text-transparent",
              selected &&
                "border-(--exercise-accent) bg-(--exercise-accent-soft) shadow-[inset_0_0_0_1px_var(--exercise-accent)]",
            )}
          >
            {showCaret ? (
              <span
                aria-hidden
                className="pointer-events-none absolute top-[-0.12em] bottom-[-0.12em] left-[-0.16em] z-20 w-[2px] animate-pulse rounded-full bg-(--exercise-accent)"
              />
            ) : null}
            {part.entered || "·"}
          </span>
        );
      })}
      {focused &&
      selection.start === selection.end &&
      selection.start >= maximumLength ? (
        <span
          aria-hidden
          className="h-[1.35em] w-[2px] animate-pulse rounded-full bg-(--exercise-accent)"
        />
      ) : null}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        defaultValue={enteredValue}
        onChange={(event) => {
          if (
            composingRef.current ||
            (event.nativeEvent as InputEvent).isComposing
          ) {
            return;
          }
          commitInputValue(event.currentTarget);
          queueMicrotask(() => syncSelection(event.currentTarget));
        }}
        onFocus={(event) => {
          setFocused(true);
          syncSelection(event.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onSelect={(event) => syncSelection(event.currentTarget)}
        onKeyUp={(event) => syncSelection(event.currentTarget)}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(event) => {
          const input = event.currentTarget;
          composingRef.current = false;
          queueMicrotask(() => {
            if (!composingRef.current && input.isConnected) {
              commitInputValue(input);
              syncSelection(input);
            }
          });
        }}
        onPaste={(event) => {
          const pasted = editableAnswerCharacters(
            event.clipboardData.getData("text"),
          );
          const selectionLength = Math.max(
            0,
            (inputRef.current?.selectionEnd ?? 0) -
              (inputRef.current?.selectionStart ?? 0),
          );
          if (
            enteredValue.length - selectionLength + pasted.length >
            maximumLength
          ) {
            rejectOverflow();
          }
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        name={name}
        aria-label={ariaLabel}
        aria-invalid={enteredValue.length > 0 && !complete}
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full opacity-0"
      />
    </span>
  );
}
