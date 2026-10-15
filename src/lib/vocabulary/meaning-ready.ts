/**
 * Avoid firing meaning checks on incomplete / partial words while typing.
 * Blur / explicit schedule still validates shorter strings (min 2 elsewhere).
 */

/** True when the meaning looks like the learner is mid-edit. */
export function isPartialMeaningInput(meaning: string): boolean {
  const text = meaning.trim();
  if (text.length === 0) return true;
  if (text.length < 3) return true;
  // Very short single token — likely still typing (e.g. "ho", "hou").
  if (!/\s/.test(text) && text.length < 4) return true;
  // Trailing joiners / space → next token incoming.
  if (/[-–]$/.test(text) || /\s$/.test(meaning)) return true;
  return false;
}

/** Longer debounce while the input still looks partial. */
export function meaningCheckDebounceMs(
  meaning: string,
  baseMs: number,
  partialMs: number,
): number {
  return isPartialMeaningInput(meaning) ? partialMs : baseMs;
}
