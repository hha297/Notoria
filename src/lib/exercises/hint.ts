export const HINT_COUNTDOWN_SECONDS = 30;

export function hintInitialLetter(text: string) {
  const first = [...text.trim()][0];
  if (!first) return "";
  return first.toLocaleUpperCase();
}
