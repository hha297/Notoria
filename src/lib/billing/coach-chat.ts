import { z } from "zod";
import {
  COACH_RECOMMENDATION_HREFS,
  type CoachRecommendationType,
  type CoachSnapshot,
  type WeakWordItem,
} from "@/lib/billing/coach-model";

export const COACH_CHAT_ACTION_TYPES = [
  "flashcard_review",
  "weak_words",
  "speaking",
  "listening",
  "writing",
  "theory",
  "keep_going",
] as const satisfies readonly CoachRecommendationType[];

export type CoachChatActionType = (typeof COACH_CHAT_ACTION_TYPES)[number];

export type CoachChatAction = {
  type: CoachChatActionType;
  label: string;
  href: string;
};

export type LearningCoachContext = {
  workspace: { language: string };
  vocabulary: {
    total: number;
    MASTERED: number;
    REVIEW: number;
    LEARNING: number;
    NEW: number;
    due: number;
    difficultWords: Array<{ word: string; recentDifficulty: string }>;
  };
  activity: {
    last7Days: CoachSnapshot["last7Days"];
    previous7Days: CoachSnapshot["previous7Days"];
  };
  coachInsights: {
    empty: boolean;
    currentFocus: CoachRecommendationType | null;
    recommendations: Array<{ type: CoachRecommendationType; reason: string }>;
    practicePlan: Array<{
      type: CoachRecommendationType;
      estimatedMinutes: number;
      detail: string;
    }>;
    crossModule: Array<{ type: string; reason: string }>;
    trendsAvailable: boolean;
    trends: Array<{ key: string; previous: number; current: number }>;
  };
  progress?: {
    periodDays: number;
    current: CoachSnapshot["last7Days"];
    previous: CoachSnapshot["last7Days"];
    comparisons: Array<{
      key: string;
      previous: number;
      current: number;
      delta: number;
    }>;
    notices: string[];
  };
};

export type CoachChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export const MAX_COACH_CHAT_HISTORY = 8;
export const MAX_COACH_CHAT_MESSAGE_CHARS = 2000;

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_COACH_CHAT_MESSAGE_CHARS),
});

export const coachChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(MAX_COACH_CHAT_MESSAGE_CHARS),
  history: z.array(historyMessageSchema).max(MAX_COACH_CHAT_HISTORY).default([]),
});

const aiActionSchema = z.object({
  type: z.enum(COACH_CHAT_ACTION_TYPES),
  label: z.string().trim().min(1).max(80),
});

export const coachChatAiResponseSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  actions: z.array(aiActionSchema).max(4).optional().default([]),
});

export type CoachChatAiResponse = z.infer<typeof coachChatAiResponseSchema>;

export function buildLearningCoachContext(
  snapshot: CoachSnapshot,
  progress?: {
    periodDays: number;
    current: CoachSnapshot["last7Days"];
    previous: CoachSnapshot["last7Days"];
    comparisons: Array<{
      key: string;
      previous: number;
      current: number;
      delta: number;
    }>;
    notices: string[];
  },
): LearningCoachContext {
  return {
    workspace: { language: snapshot.language },
    vocabulary: {
      total: snapshot.vocabularyTotal,
      MASTERED: snapshot.vocabulary.MASTERED,
      REVIEW: snapshot.vocabulary.REVIEW,
      LEARNING: snapshot.vocabulary.LEARNING,
      NEW: snapshot.vocabulary.NEW,
      due: snapshot.dueCards,
      difficultWords: snapshot.weakItems.slice(0, 8).map(compactWeakItem),
    },
    activity: {
      last7Days: snapshot.last7Days,
      previous7Days: snapshot.previous7Days,
    },
    coachInsights: {
      empty: snapshot.empty,
      currentFocus: snapshot.recommendations[0]?.type ?? null,
      recommendations: snapshot.recommendations.slice(0, 5).map((item) => ({
        type: item.type,
        reason: item.reason,
      })),
      practicePlan: snapshot.practicePlan.slice(0, 4).map((step) => ({
        type: step.type,
        estimatedMinutes: step.estimatedMinutes,
        detail: step.detail,
      })),
      crossModule: snapshot.crossModule.slice(0, 3).map((hint) => ({
        type: hint.type,
        reason: hint.reason,
      })),
      trendsAvailable: snapshot.trendsAvailable,
      trends: snapshot.trendsAvailable
        ? snapshot.trends.map((trend) => ({
            key: trend.key,
            previous: trend.previous,
            current: trend.current,
          }))
        : [],
    },
    progress: progress
      ? {
          periodDays: progress.periodDays,
          current: progress.current,
          previous: progress.previous,
          comparisons: progress.comparisons.slice(0, 8),
          notices: progress.notices.slice(0, 4),
        }
      : undefined,
  };
}

function compactWeakItem(item: WeakWordItem) {
  return {
    word: item.word,
    recentDifficulty: item.rating,
  };
}

/** Server-side allowlist: AI may only propose known coach destinations. */
export function validateCoachChatActions(
  actions: Array<{ type: CoachChatActionType; label: string }>,
): CoachChatAction[] {
  const seen = new Set<CoachChatActionType>();
  const validated: CoachChatAction[] = [];

  for (const action of actions) {
    if (seen.has(action.type)) continue;
    const href = COACH_RECOMMENDATION_HREFS[action.type];
    if (!href) continue;
    seen.add(action.type);
    validated.push({
      type: action.type,
      label: action.label.slice(0, 80),
      href,
    });
    if (validated.length >= 4) break;
  }

  return validated;
}

export type CoachSuggestedPromptId =
  | "practice_today"
  | "struggling_words"
  | "practice_weak"
  | "review_first"
  | "neglecting"
  | "improve_speaking"
  | "study_20"
  | "getting_started"
  | "am_i_improving"
  | "what_changed";

export type CoachSuggestedPrompt = {
  id: CoachSuggestedPromptId;
  /** next-intl key under coach.ask.prompts.* */
  messageKey: CoachSuggestedPromptId;
};

/**
 * Suggested questions only when underlying data can support an answer.
 * New / empty workspaces get starter prompts instead of data-specific ones.
 */
export function buildCoachSuggestedPrompts(
  snapshot: CoachSnapshot,
): CoachSuggestedPrompt[] {
  if (snapshot.empty) {
    return [
      { id: "getting_started", messageKey: "getting_started" },
      { id: "study_20", messageKey: "study_20" },
      { id: "practice_today", messageKey: "practice_today" },
    ];
  }

  const prompts: CoachSuggestedPrompt[] = [
    { id: "practice_today", messageKey: "practice_today" },
    { id: "am_i_improving", messageKey: "am_i_improving" },
  ];

  if (snapshot.dueCards > 0) {
    prompts.push({ id: "review_first", messageKey: "review_first" });
  }

  if (snapshot.weakWords.length > 0) {
    prompts.push({ id: "struggling_words", messageKey: "struggling_words" });
  }

  const week = snapshot.last7Days;
  const modulesQuiet =
    (week.listeningLessons === 0 ? 1 : 0) +
      (week.speakingSessions === 0 ? 1 : 0) +
      (week.writingDocuments === 0 ? 1 : 0) +
      (week.theoryNotes === 0 ? 1 : 0) >=
    2;
  if (modulesQuiet) {
    prompts.push({ id: "neglecting", messageKey: "neglecting" });
  }

  if (week.speakingSessions === 0 && snapshot.vocabularyTotal > 0) {
    prompts.push({ id: "improve_speaking", messageKey: "improve_speaking" });
  }

  if (snapshot.trendsAvailable) {
    prompts.push({ id: "what_changed", messageKey: "what_changed" });
  }

  prompts.push({ id: "study_20", messageKey: "study_20" });

  return prompts.slice(0, 6);
}

export const COACH_CHAT_SYSTEM_PROMPT = [
  "You are Notoria's Learning Coach — a supportive, practical language-learning coach who also understands how this learner studies inside Notoria.",
  "You can help with: personalized practice advice from Notoria facts, vocabulary, grammar/theory, speaking/listening/writing tips, translations, explaining articles or other study content the learner pastes, and general language questions.",
  "When the question is about THIS learner's progress, prioritize the supplied Notoria facts. Never invent metrics, sessions, scores, pronunciation quality, CEFR ability, or activities that are not in the facts.",
  "When the question is general language learning (grammar, vocabulary meaning, translation, theory), answer helpfully even if Notoria facts are sparse — and clearly separate general guidance from personalized claims.",
  "If personalized data is missing or zero, say you do not have enough evidence rather than guessing.",
  "Distinguish facts (from context) from suggestions (your advice).",
  "Prefer: observation → why it matters → recommendation → optional action when giving personalized advice.",
  "Keep replies concise: short paragraphs, bullets, or numbered steps. No motivational filler or greetings every turn.",
  "CRITICAL language rule: answer in the same language as the learner's latest message. If they ask in English about Finnish grammar or Finnish vocabulary, reply in English (you may still quote Finnish words/examples). Never switch to the workspace learning language just because the topic is that language.",
  "Learning-language content (example words, phrases to practice) should stay appropriate to workspace.language when relevant.",
  "When recommending practice inside Notoria, only use action types from the allowed list.",
  "Return JSON only: {\"message\":\"...\",\"actions\":[{\"type\":\"flashcard_review\",\"label\":\"Review due words\"}]}",
  "Allowed action types: flashcard_review, weak_words, speaking, listening, writing, theory, keep_going.",
  "Omit actions when none are useful. At most 4 actions.",
  "Pro gives tools; Premium helps you use them intelligently — be that intelligence layer.",
].join(" ");
