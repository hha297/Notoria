import type { TutorialPrepareAction } from "@/lib/onboarding/tutorials";

export const TUTORIAL_PREPARE_EVENT = "notoria:tutorial-prepare";

export type { TutorialPrepareAction };

export function dispatchTutorialPrepare(action: TutorialPrepareAction) {
  window.dispatchEvent(
    new CustomEvent(TUTORIAL_PREPARE_EVENT, { detail: { action } }),
  );
}

export function onTutorialPrepare(
  handler: (action: TutorialPrepareAction) => void,
) {
  function listener(event: Event) {
    const custom = event as CustomEvent<{ action: TutorialPrepareAction }>;
    if (custom.detail?.action) {
      handler(custom.detail.action);
    }
  }

  window.addEventListener(TUTORIAL_PREPARE_EVENT, listener);
  return () => window.removeEventListener(TUTORIAL_PREPARE_EVENT, listener);
}
