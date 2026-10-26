export const HINT_COUNTDOWN_SECONDS = 30;

export function hintInitialLetter(text: string) {
  const first = [...text.trim()][0];
  if (!first) return "";
  return first.toLocaleUpperCase();
}

function isContentChar(ch: string) {
  return /\p{L}|\p{N}/u.test(ch);
}

/**
 * How many leading content characters to keep visible.
 * Normally 3; shorter answers keep fewer so something stays hidden.
 * Never keeps the full answer.
 */
export function spellingHintKeepCount(contentCount: number) {
  if (contentCount <= 1) return 0;
  if (contentCount === 2) return 1;
  if (contentCount === 3) return 1;
  return Math.min(3, contentCount - 1);
}

/**
 * Partial surface-form hint derived from the canonical answer.
 * Reveals a short prefix of letters/digits and masks the rest with `_`.
 * Spaces and hyphens stay visible. Never returns the complete answer.
 */
export function partialAnswerHint(answer: string): string {
  const trimmed = answer.normalize("NFC").trim();
  if (!trimmed) return "";
  const chars = [...trimmed];
  const contentCount = chars.filter(isContentChar).length;
  if (contentCount === 0) return "";

  const keep = spellingHintKeepCount(contentCount);
  if (keep <= 0) {
    return chars.map((ch) => (isContentChar(ch) ? "_" : ch)).join("");
  }

  let seen = 0;
  const masked = chars
    .map((ch) => {
      if (!isContentChar(ch)) return ch;
      seen += 1;
      return seen <= keep ? ch : "_";
    })
    .join("");

  // Safety: never equal the full answer (case-insensitive, ignoring mask chars).
  if (masked.toLocaleLowerCase() === trimmed.toLocaleLowerCase()) {
    return chars.map((ch) => (isContentChar(ch) ? "_" : ch)).join("");
  }
  return masked;
}

/** True when `hint` is exactly the deterministic spelling mask for one answer. */
export function isSpellingMaskHint(hint: string, answers: readonly string[]) {
  const text = hint.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!text || !text.includes("_")) return false;
  return answers.some((answer) => {
    const mask = partialAnswerHint(answer);
    return Boolean(mask) && mask.toLocaleLowerCase() === text.toLocaleLowerCase();
  });
}
