/**
 * Document-level scroll helpers for exercise sets.
 * Studio uses document scroll (not a nested overflow container).
 */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

/** Blur active control so mobile keyboards / focus don't yank scroll back. */
export function blurActiveExerciseControl() {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}

/**
 * Bring the set start (or a specific question) into view under sticky chrome.
 * Question cards already use scroll-mt-24.
 */
export function scrollToExerciseAnchor(
  elementId: string,
  options?: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition },
) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(elementId);
  if (!el) return;
  el.scrollIntoView({
    behavior: options?.behavior ?? scrollBehavior(),
    block: options?.block ?? "start",
  });
}

/** After New set / reshuffle: reset focus and jump to the set top. */
export function scrollToNewExerciseSet(anchorId: string) {
  blurActiveExerciseControl();
  // Double rAF: wait for the new set to paint before scrolling.
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollToExerciseAnchor(anchorId, { block: "start" });
    });
  });
}

export function scrollToExerciseQuestion(questionElementId: string) {
  blurActiveExerciseControl();
  scrollToExerciseAnchor(questionElementId, { block: "start" });
}
