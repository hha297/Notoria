export const TUTORIAL_SECTIONS = [
  "vocabulary",
  "writing",
  "theory",
  "exercise",
  "conversation",
] as const;

export type TutorialSectionId = (typeof TUTORIAL_SECTIONS)[number];

export type TutorialStepDefinition = {
  id: string;
};

export type TutorialDefinition = {
  id: TutorialSectionId;
  steps: readonly TutorialStepDefinition[];
  /** Optional primary action shown on the last step. */
  ctaHref?: string;
};

/**
 * Section tutorial catalog. Add a new entry here (and matching i18n strings)
 * to support another section without changing the tutorial UI.
 */
export const SECTION_TUTORIALS = {
  vocabulary: {
    id: "vocabulary",
    ctaHref: "/vocabulary/new",
    steps: [{ id: "addWord" }, { id: "tags" }, { id: "review" }],
  },
  writing: {
    id: "writing",
    ctaHref: "/writing/new",
    steps: [{ id: "create" }, { id: "organize" }, { id: "practice" }],
  },
  theory: {
    id: "theory",
    ctaHref: "/theory/new",
    steps: [{ id: "add" }, { id: "browse" }, { id: "read" }],
  },
  exercise: {
    id: "exercise",
    ctaHref: "/exercises",
    steps: [{ id: "vocabulary" }, { id: "choose" }, { id: "practice" }],
  },
  conversation: {
    id: "conversation",
    steps: [{ id: "start" }, { id: "practice" }, { id: "review" }],
  },
} as const satisfies Record<TutorialSectionId, TutorialDefinition>;

export function getSectionTutorial(
  section: TutorialSectionId,
): TutorialDefinition {
  return SECTION_TUTORIALS[section];
}
