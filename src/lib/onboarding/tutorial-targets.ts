export const TUTORIAL_TARGET_ATTR = "data-tutorial";

export function tutorialTargetSelector(targetId: string): string {
  return `[${TUTORIAL_TARGET_ATTR}="${targetId}"]`;
}

export function findTutorialTarget(targetId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(tutorialTargetSelector(targetId));
}
