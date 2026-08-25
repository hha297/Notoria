/**
 * Unified theory-exercise item shape.
 * Session UI does not care whether an item was system- or AI-generated.
 * Designed so Mixed Practice can later share the same contract.
 */

export type ExerciseSource = "theory" | "vocabulary";
export type ExerciseGenerator = "system" | "ai";
export type TheoryMaterialSource = "theory" | "vocabulary" | "ai";

export type TheoryExerciseType =
  | "fill_blank"
  | "transformation"
  | "multiple_choice"
  | "theory_question"
  | "match_pairs"
  | "true_false";

export type TheoryExerciseBase = {
  id: string;
  source: "theory";
  theoryId: string;
  generator: ExerciseGenerator;
  type: TheoryExerciseType;
  typeLabelKey: TheoryExerciseType;
  /** Where the tested word/material came from (not shown in UI). */
  materialSource: TheoryMaterialSource;
  /** Short skill label shown above the prompt, e.g. theory title. */
  skillLabel?: string;
  /** What the learner should do, e.g. "Apply the rule to the following word." */
  instruction?: string;
};

export type TheoryMultipleChoiceExercise = TheoryExerciseBase & {
  type: "multiple_choice";
  prompt: string;
  options: string[];
  correctOption: string;
  explanation?: string;
};

/** Limited conceptual true/false — prefer theory_question in new code. */
export type TheoryTrueFalseExercise = TheoryExerciseBase & {
  type: "true_false";
  statement: string;
  correct: boolean;
  explanation?: string;
};

export type TheoryMatchPairsExercise = TheoryExerciseBase & {
  type: "match_pairs";
  pairs: Array<{ id: string; left: string; right: string }>;
};

export type TheoryFillBlankExercise = TheoryExerciseBase & {
  type: "fill_blank";
  /** Sentence / rule with ________ for the blank (fallback display). */
  sentence: string;
  /** Expected tail or full answer depending on prefix/spaced. */
  answer: string;
  hint?: string;
  /** Visible stem/base before the blank (discovered from Theory). */
  prefix?: string;
  /** Optional text after the blank. */
  suffix?: string;
  /** Separate token after prefix (space between base and answer). */
  spaced?: boolean;
};

export type TheoryTransformationExercise = TheoryExerciseBase & {
  type: "transformation";
  /** Base word shown to the learner. */
  promptWord: string;
  answer: string;
  /** Optional arrow display: promptWord → ________ */
  showArrow?: boolean;
  /** Pattern / transformation hint shown to the learner (discovered from Theory). */
  hint?: string;
};

/**
 * Conceptual / rule questions (fill, MC, or limited true/false).
 * Presented in UI as "Theory Check".
 */
export type TheoryConceptExercise = TheoryExerciseBase & {
  type: "theory_question";
  mode: "fill" | "multiple_choice" | "true_false";
  prompt: string;
  answer: string;
  options?: string[];
  correctBoolean?: boolean;
  explanation?: string;
};

export type TheoryExercise =
  | TheoryMultipleChoiceExercise
  | TheoryTrueFalseExercise
  | TheoryMatchPairsExercise
  | TheoryFillBlankExercise
  | TheoryTransformationExercise
  | TheoryConceptExercise;

export type TheoryExerciseSession = {
  theoryId: string;
  theoryTitle: string;
  /** Discovered knowledge shape — for internal routing / future UX copy only. */
  knowledgeKind:
    | "transformation"
    | "relation"
    | "definition"
    | "mixed"
    | "unknown";
  items: TheoryExercise[];
};

export type TheoryVocabWord = {
  id: string;
  word: string;
  partOfSpeech?: string | null;
};
