import type { ReactNode } from "react";

/**
 * Split a sentence and wrap tokens that match the card lemma (case/accent
 * insensitive; leading/trailing punctuation ignored).
 */
export function highlightLemmaInSentence(
  sentence: string,
  lemma: string,
): ReactNode[] {
  const target = lemma.trim();
  if (!target || !sentence) return [sentence];

  const parts = sentence.split(/(\s+)/);
  return parts.map((part, index) => {
    if (/^\s+$/.test(part)) {
      return <span key={`s-${index}`}>{part}</span>;
    }
    if (!isSameWordToken(part, target)) {
      return <span key={`w-${index}`}>{part}</span>;
    }
    return (
      <strong
        key={`w-${index}`}
        className="font-semibold text-ink not-italic"
      >
        {part}
      </strong>
    );
  });
}

export function isSameWordToken(token: string, word: string) {
  const stripped = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!stripped) return false;
  return (
    stripped.localeCompare(word.trim(), undefined, {
      sensitivity: "accent",
    }) === 0
  );
}
