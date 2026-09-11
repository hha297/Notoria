import type { WritingAiSuggestion } from "@/lib/writing/ai-types";
import type { WritingQuestion, WritingSection } from "@/lib/writing/content";
import { contentContainsPhrase } from "@/lib/writing/plain-text";

export type QuestionAiFeedbackMap = Record<string, WritingAiSuggestion[]>;

function questionSearchText(question: WritingQuestion) {
  return [question.prompt, question.exampleAnswer]
    .filter((value) => value.trim())
    .join("\n");
}

export function findQuestionIdForSuggestion(
  sections: WritingSection[],
  suggestion: WritingAiSuggestion,
): string | null {
  for (const section of sections) {
    for (const question of section.questions) {
      const text = questionSearchText(question);
      if (!text) continue;
      if (contentContainsPhrase(text, suggestion.original)) {
        return question.id;
      }
    }
  }
  return null;
}

/** Group AI suggestions under the question whose text contains the original phrase. */
export function attributeSuggestionsToQuestions(
  sections: WritingSection[],
  suggestions: WritingAiSuggestion[],
): QuestionAiFeedbackMap {
  const byQuestion: QuestionAiFeedbackMap = {};

  for (const suggestion of suggestions) {
    const questionId = findQuestionIdForSuggestion(sections, suggestion);
    if (!questionId) continue;
    const list = byQuestion[questionId] ?? [];
    list.push(suggestion);
    byQuestion[questionId] = list;
  }

  return byQuestion;
}

export function removeSuggestionFromMap(
  map: QuestionAiFeedbackMap,
  questionId: string,
  suggestionId: string,
): QuestionAiFeedbackMap {
  const current = map[questionId];
  if (!current) return map;

  const next = current.filter(
    (item) => (item.id ?? item.original) !== suggestionId,
  );

  if (next.length === current.length) return map;

  const updated = { ...map };
  if (next.length === 0) {
    delete updated[questionId];
  } else {
    updated[questionId] = next;
  }
  return updated;
}

export function clearQuestionFeedback(
  map: QuestionAiFeedbackMap,
  questionId: string,
): QuestionAiFeedbackMap {
  if (!(questionId in map)) return map;
  const updated = { ...map };
  delete updated[questionId];
  return updated;
}
