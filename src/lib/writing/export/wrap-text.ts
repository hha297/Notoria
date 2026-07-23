import { BLANK_LINE_COUNT } from "@/lib/writing/export/types";

/** Approx chars that fit on one ruled line in the PDF worksheet. */
const PDF_CHARS_PER_LINE = 68;

export function wrapTextOntoLines(
  text: string,
  maxLines = BLANK_LINE_COUNT,
  maxCharsPerLine = PDF_CHARS_PER_LINE,
): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return Array.from({ length: maxLines }, () => "");
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length >= maxLines) {
        return lines;
      }
    }

    // Hard-wrap a single oversized word
    if (word.length > maxCharsPerLine) {
      let remaining = word;
      while (remaining.length > 0 && lines.length < maxLines) {
        lines.push(remaining.slice(0, maxCharsPerLine));
        remaining = remaining.slice(maxCharsPerLine);
      }
      current = "";
    } else {
      current = word;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  while (lines.length < maxLines) {
    lines.push("");
  }

  return lines.slice(0, maxLines);
}

/**
 * Wrap all text onto ruled lines (no fixed max). Used by Rich Document PDF.
 * Optionally append blank ruled lines after the text.
 */
export function wrapTextFullyOntoLines(
  text: string,
  trailingBlankLines = 0,
  maxCharsPerLine = PDF_CHARS_PER_LINE,
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return Array.from({ length: Math.max(1, trailingBlankLines) }, () => "");
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (word.length > maxCharsPerLine) {
      let remaining = word;
      while (remaining.length > 0) {
        lines.push(remaining.slice(0, maxCharsPerLine));
        remaining = remaining.slice(maxCharsPerLine);
      }
      current = "";
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  for (let i = 0; i < trailingBlankLines; i++) {
    lines.push("");
  }

  return lines;
}
