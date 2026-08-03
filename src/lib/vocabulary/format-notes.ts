/**
 * Deterministic notes formatter for the vocabulary form.
 * Idempotent: format(format(x)) === format(x).
 * Never reorders sections or renumbers lists (meaning-preserving).
 */

const BULLET_RE = /^(\s*)([-*•●◦]|\u2022|\u00B7)\s+(.*)$/;
const NUMBERED_RE = /^(\s*)(\d+)[.)]\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^(\s*)(`{3,}|~{3,})(.*)$/;
const BLOCKQUOTE_RE = /^(\s*>+\s?)(.*)$/;

function normalizeIndent(leading: string): string {
  const spaces = leading.replace(/\t/g, "  ").replace(/[^ ]/g, "");
  const level = Math.floor(spaces.length / 2);
  return "  ".repeat(level);
}

/** Collapse runs of spaces/tabs outside inline `code` spans. */
function collapseSpacesOutsideInlineCode(text: string): string {
  const parts = text.split(/(`[^`]*`)/g);
  return parts
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return part;
      }
      return part.replace(/[ \t]+/g, " ");
    })
    .join("")
    .trimEnd();
}

function formatContentLine(line: string): string {
  const withoutTrailing = line.replace(/[ \t]+$/g, "");

  const fence = withoutTrailing.match(FENCE_RE);
  if (fence) {
    return `${fence[1]}${fence[2]}${fence[3]}`.trimEnd();
  }

  const heading = withoutTrailing.match(HEADING_RE);
  if (heading) {
    const title = collapseSpacesOutsideInlineCode(heading[2]).trim();
    return `${heading[1]} ${title}`;
  }

  const blockquote = withoutTrailing.match(BLOCKQUOTE_RE);
  if (blockquote) {
    const body = formatContentLine(blockquote[2]);
    return `${blockquote[1].replace(/\s+$/g, " ")}${body}`.trimEnd();
  }

  const bullet = withoutTrailing.match(BULLET_RE);
  if (bullet) {
    const indent = normalizeIndent(bullet[1]);
    const body = collapseSpacesOutsideInlineCode(bullet[3]).trim();
    return `${indent}- ${body}`;
  }

  const numbered = withoutTrailing.match(NUMBERED_RE);
  if (numbered) {
    const indent = normalizeIndent(numbered[1]);
    const body = collapseSpacesOutsideInlineCode(numbered[3]).trim();
    return `${indent}${numbered[2]}. ${body}`;
  }

  return collapseSpacesOutsideInlineCode(withoutTrailing).trimStart();
}

/**
 * Format vocabulary notes for readability without changing meaning.
 */
export function formatVocabularyNotes(input: string): string {
  if (!input.trim()) {
    return "";
  }

  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const result: string[] = [];
  let inCodeFence = false;
  let prevBlank = false;

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch && !inCodeFence) {
      inCodeFence = true;
      result.push(`${fenceMatch[1]}${fenceMatch[2]}${fenceMatch[3]}`.trimEnd());
      prevBlank = false;
      continue;
    }

    if (fenceMatch && inCodeFence) {
      inCodeFence = false;
      result.push(`${fenceMatch[1]}${fenceMatch[2]}${fenceMatch[3]}`.trimEnd());
      prevBlank = false;
      continue;
    }

    if (inCodeFence) {
      result.push(line);
      prevBlank = false;
      continue;
    }

    if (line.trim() === "") {
      if (!prevBlank && result.length > 0) {
        result.push("");
        prevBlank = true;
      }
      continue;
    }

    prevBlank = false;
    result.push(formatContentLine(line));
  }

  while (result.length > 0 && result[0] === "") {
    result.shift();
  }
  while (result.length > 0 && result[result.length - 1] === "") {
    result.pop();
  }

  return result.join("\n");
}
