export const FEATURE_REQUIREMENTS = {
  vocabulary: {
    firstWord: 1,
  },
  exercises: {
    /** Below this, exercises are not a useful first action. */
    minVocabulary: 5,
    /** Recommended before suggesting exercises as the primary next step. */
    recommendedVocabulary: 10,
  },
} as const;

export type VocabularyReadiness = "empty" | "starting" | "almost" | "ready";

export type OnboardingActionId =
  | "add-vocabulary"
  | "start-writing"
  | "try-exercise"
  | "explore-theory"
  | "explore-workspace";

export type WorkspaceActivitySnapshot = {
  vocabularyCount: number;
  writingCount: number;
  theoryCount: number;
  practiceCount: number;
};

export const EMPTY_WORKSPACE_SNAPSHOT: WorkspaceActivitySnapshot = {
  vocabularyCount: 0,
  writingCount: 0,
  theoryCount: 0,
  practiceCount: 0,
};

export type PrerequisiteCheck = {
  id: string;
  feature: OnboardingActionId;
  isMet: (snapshot: WorkspaceActivitySnapshot) => boolean;
};

/**
 * Feature unlock rules. Add entries here when new prerequisites appear
 * (e.g. a completed writing, a theory note, activity volume).
 */
export const PREREQUISITE_CHECKS: PrerequisiteCheck[] = [
  {
    id: "exercises.vocabulary.recommended",
    feature: "try-exercise",
    isMet: (snapshot) =>
      snapshot.vocabularyCount >=
      FEATURE_REQUIREMENTS.exercises.recommendedVocabulary,
  },
];

export function isFeatureUnlocked(
  feature: OnboardingActionId,
  snapshot: WorkspaceActivitySnapshot,
): boolean {
  return PREREQUISITE_CHECKS.filter((check) => check.feature === feature).every(
    (check) => check.isMet(snapshot),
  );
}

export function getVocabularyReadiness(count: number): VocabularyReadiness {
  const { minVocabulary, recommendedVocabulary } = FEATURE_REQUIREMENTS.exercises;
  if (count <= 0) return "empty";
  if (count < minVocabulary) return "starting";
  if (count < recommendedVocabulary) return "almost";
  return "ready";
}

export function isEmptyWorkspace(snapshot: WorkspaceActivitySnapshot): boolean {
  return (
    snapshot.vocabularyCount === 0 &&
    snapshot.writingCount === 0 &&
    snapshot.theoryCount === 0 &&
    snapshot.practiceCount === 0
  );
}

export type OnboardingAction = {
  id: OnboardingActionId;
  href: string;
  titleKey: string;
  descriptionKey: string;
};

const MAX_SUGGESTED_ACTIONS = 3;

export function getSuggestedOnboardingActions(
  snapshot: WorkspaceActivitySnapshot,
): OnboardingAction[] {
  const actions: OnboardingAction[] = [];
  const readiness = getVocabularyReadiness(snapshot.vocabularyCount);

  if (readiness !== "ready") {
    actions.push({
      id: "add-vocabulary",
      href: "/vocabulary/new",
      titleKey: `actions.addVocabulary.${readiness}.title`,
      descriptionKey: `actions.addVocabulary.${readiness}.description`,
    });
  } else if (isFeatureUnlocked("try-exercise", snapshot) && snapshot.practiceCount === 0) {
    actions.push({
      id: "try-exercise",
      href: "/exercises",
      titleKey: "actions.tryExercise.title",
      descriptionKey: "actions.tryExercise.description",
    });
  }

  if (snapshot.writingCount === 0) {
    actions.push({
      id: "start-writing",
      href: "/writing/new",
      titleKey: "actions.startWriting.title",
      descriptionKey: "actions.startWriting.description",
    });
  }

  if (snapshot.theoryCount === 0) {
    actions.push({
      id: "explore-theory",
      href: "/theory",
      titleKey: "actions.exploreTheory.title",
      descriptionKey: "actions.exploreTheory.description",
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "explore-workspace",
      href: "/",
      titleKey: "actions.exploreWorkspace.title",
      descriptionKey: "actions.exploreWorkspace.description",
    });
  }

  return actions.slice(0, MAX_SUGGESTED_ACTIONS);
}
