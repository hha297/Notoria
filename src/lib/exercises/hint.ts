export const HINT_COUNTDOWN_SECONDS = 30;

export function hintInitialLetter(text: string) {
  const first = [...text.trim()][0];
  if (!first) return "";
  return first.toLocaleUpperCase();
}

/**
 * Partial surface-form hint: keep a short prefix of content characters,
 * replace the rest with dots. Spaces/punctuation stay visible so length
 * cues remain language-agnostic (no hardcoded sample words).
 */
export function partialAnswerHint(answer: string): string {
  const trimmed = answer.trim();
  if (!trimmed) return "";
  const chars = [...trimmed];
  const contentCount = chars.filter((ch) => /\p{L}|\p{N}/u.test(ch)).length;
  if (contentCount === 0) return trimmed;
  // Single-letter answers would otherwise reveal the whole word.
  const keep =
    contentCount <= 1
      ? 0
      : Math.min(
          Math.max(1, Math.ceil(contentCount * 0.35)),
          Math.min(3, contentCount - 1),
        );
  let seen = 0;
  return chars
    .map((ch) => {
      if (!/\p{L}|\p{N}/u.test(ch)) return ch;
      seen += 1;
      return seen <= keep ? ch : "·";
    })
    .join("");
}
