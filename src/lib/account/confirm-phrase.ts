/**
 * Shared confirmation-phrase helpers for destructive account actions.
 * Frontend and backend must use the same normalization rules.
 */

/** NFC + trim; preserves accents and internal spacing. */
export function trimConfirmPhrase(value: string): string {
  return value.normalize("NFC").trim();
}

/**
 * Locale-aware fold for comparison (handles Turkish İ/I, etc.).
 * Caseless scripts are unchanged by toLocaleLowerCase.
 */
export function foldConfirmPhrase(value: string, locale: string): string {
  return trimConfirmPhrase(value).toLocaleLowerCase(locale);
}

export function matchesConfirmPhrase(
  input: string,
  expected: string,
  locale: string,
): boolean {
  if (!expected) return false;
  return foldConfirmPhrase(input, locale) === foldConfirmPhrase(expected, locale);
}

/**
 * Presentation form for instruction + placeholder.
 * Uppercases when the script supports it and uppercasing is lossless for
 * matching (e.g. skip Greek tonos loss: Ά → Α).
 * Caseless scripts are unchanged.
 */
export function displayConfirmPhrase(phrase: string, locale: string): string {
  const trimmed = trimConfirmPhrase(phrase);
  const upper = trimmed.toLocaleUpperCase(locale);
  if (foldConfirmPhrase(upper, locale) === foldConfirmPhrase(trimmed, locale)) {
    return upper;
  }
  return trimmed;
}
