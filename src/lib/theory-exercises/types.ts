/**
 * Theory exercise item shapes — AI-generated only.
 * Vocabulary exercises remain a separate system.
 */

export type TheoryMaterialSource = "theory" | "vocabulary" | "ai";

export type TheoryExerciseType = "fill_blank" | "transformation" | "multiple_choice";

/** What the exercise isolates and tests (from Theory knowledge). */
export type TheoryLearningTargetType =
  | "suffix"
  | "prefix"
  | "word_form"
  | "full_word"
  | "structure"
  | "concept";

export type TheoryExerciseBase = {
  id: string;
  source: "theory";
  theoryId: string;
  generator: "ai";
  type: TheoryExerciseType;
  typeLabelKey: TheoryExerciseType;
  materialSource: TheoryMaterialSource;
  skillLabel?: string;
  instruction?: string;
  hint?: string;
  explanation?: string;
  /** Short statement of what is being practiced (not shown unless useful). */
  learningObjective?: string;
  targetType?: TheoryLearningTargetType;
};

export type TheoryFillBlankExercise = TheoryExerciseBase & {
  type: "fill_blank";
  /** Prompt with ________ blank (or plain context when prefix is used). */
  sentence: string;
  /** Canonical expected answer (may be a span such as an ending, or a full form). */
  answer: string;
  /** All accepted spellings / variants. */
  acceptedAnswers: string[];
  /** Visible stem/context before the blank. */
  prefix?: string;
  suffix?: string;
  spaced?: boolean;
  /** Source lemma when the blank completes/transforms a known word. */
  sourceWord?: string;
  /** Full correct sentence/form for reveal. */
  completedSentence?: string;
};

export type TheoryTransformationExercise = TheoryExerciseBase & {
  type: "transformation";
  /** Source word shown to the learner. */
  promptWord: string;
  answer: string;
  acceptedAnswers: string[];
  showArrow?: boolean;
  completedSentence?: string;
};

export type TheoryMultipleChoiceExercise = TheoryExerciseBase & {
  type: "multiple_choice";
  prompt: string;
  options: string[];
  correctOption: string;
  acceptedAnswers: string[];
  completedSentence?: string;
};

export type TheoryExercise =
  | TheoryFillBlankExercise
  | TheoryTransformationExercise
  | TheoryMultipleChoiceExercise;

export type TheoryExerciseSession = {
  theoryId: string;
  theoryTitle: string;
  items: TheoryExercise[];
};

export type TheoryVocabWord = {
  id: string;
  word: string;
  partOfSpeech?: string | null;
};
