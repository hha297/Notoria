export const TUTORIAL_SECTIONS = [
  "vocabulary",
  "theory",
  "exercise",
  "writing",
  "listening",
  "speaking",
] as const;

export type TutorialSectionId = (typeof TUTORIAL_SECTIONS)[number];

export type TutorialPrepareAction =
  | "open-listening-upload"
  | "close-listening-upload"
  | "open-folder-create"
  | "close-folder-create";

export type TutorialStepDefinition = {
  id: string;
  /** Stable `data-tutorial` identifier for guided spotlight steps. */
  target?: string;
  /** Optional UI action before the step is shown (e.g. open a dialog). */
  prepare?: TutorialPrepareAction;
};

const FOLDER_TUTORIAL_STEPS = [
  { id: "newFolder", target: "folder-new" },
  {
    id: "nameFolder",
    target: "folder-name-input",
    prepare: "open-folder-create",
  },
  { id: "organize", target: "folder-organize" },
  { id: "moveItem", target: "folder-move-item" },
] as const satisfies readonly TutorialStepDefinition[];

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
    steps: [
      { id: "addWord", target: "vocab-add-word" },
      { id: "search", target: "vocab-search" },
      { id: "filters", target: "vocab-filters" },
      { id: "library", target: "vocab-word-list" },
    ],
  },
  theory: {
    id: "theory",
    ctaHref: "/theory/new",
    steps: [
      { id: "add", target: "theory-add-note" },
      { id: "category", target: "theory-category-filter" },
      { id: "search", target: "theory-search" },
      { id: "read", target: "theory-note-list" },
      ...FOLDER_TUTORIAL_STEPS,
    ],
  },
  exercise: {
    id: "exercise",
    ctaHref: "/exercises",
    steps: [
      { id: "sources", target: "exercise-sources" },
      { id: "types", target: "exercise-types" },
    ],
  },
  writing: {
    id: "writing",
    ctaHref: "/writing/new",
    steps: [
      { id: "create", target: "writing-create" },
      { id: "search", target: "writing-search" },
      { id: "filters", target: "writing-filters" },
      { id: "library", target: "writing-list" },
      ...FOLDER_TUTORIAL_STEPS,
    ],
  },
  listening: {
    id: "listening",
    ctaHref: "/listening",
    steps: [
      { id: "upload", target: "listening-upload" },
      {
        id: "uploadArea",
        target: "listening-upload-dropzone",
        prepare: "open-listening-upload",
      },
      { id: "lessons", target: "listening-lessons" },
      ...FOLDER_TUTORIAL_STEPS,
    ],
  },
  speaking: {
    id: "speaking",
    ctaHref: "/speaking",
    steps: [
      { id: "start", target: "speaking-start" },
      { id: "sessions", target: "speaking-sessions" },
    ],
  },
} as const satisfies Record<TutorialSectionId, TutorialDefinition>;

export function getSectionTutorial(
  section: TutorialSectionId,
): TutorialDefinition {
  return SECTION_TUTORIALS[section];
}
