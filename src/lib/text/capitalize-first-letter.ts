import type { ChangeEvent, ChangeEventHandler } from "react";

/**
 * Capitalize the first non-whitespace character of a string.
 * Leaves the rest of the text, empty values, and already-capitalized
 * first letters unchanged.
 */
export function capitalizeFirstLetter(value: string) {
  if (!value) return value;

  let index = 0;
  for (const char of value) {
    if (/\s/u.test(char)) {
      index += char.length;
      continue;
    }

    const upper = char.toLocaleUpperCase();
    if (upper === char) return value;
    return value.slice(0, index) + upper + value.slice(index + char.length);
  }

  return value;
}

function adjustSelection(
  previous: string,
  next: string,
  start: number,
  end: number,
) {
  const delta = next.length - previous.length;
  if (delta === 0) return { start, end };

  let index = 0;
  const limit = Math.min(previous.length, next.length);
  while (index < limit && previous.charCodeAt(index) === next.charCodeAt(index)) {
    index += 1;
  }

  return {
    start: start > index ? Math.max(0, start + delta) : start,
    end: end > index ? Math.max(0, end + delta) : end,
  };
}

export function applyCapitalizeFirstLetter<
  T extends HTMLInputElement | HTMLTextAreaElement,
>(event: ChangeEvent<T>, onChange?: ChangeEventHandler<T>) {
  const element = event.target;
  const previous = element.value;
  const next = capitalizeFirstLetter(previous);

  if (next !== previous) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    element.value = next;

    if (start != null && end != null) {
      const selection = adjustSelection(previous, next, start, end);
      try {
        element.setSelectionRange(selection.start, selection.end);
      } catch {
        // Some input types do not support selection ranges.
      }

      requestAnimationFrame(() => {
        if (document.activeElement !== element) return;
        try {
          element.setSelectionRange(selection.start, selection.end);
        } catch {
          // Ignore selection restore failures.
        }
      });
    }
  }

  onChange?.(event);
}
