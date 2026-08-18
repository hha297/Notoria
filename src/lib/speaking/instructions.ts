import { getLanguageName } from "@/lib/languages";
import { isKnownWritingTopic, type WritingCefr } from "@/lib/writing/meta";

const TOPIC_LABELS: Record<string, string> = {
  travel: "travel",
  work: "work",
  daily: "daily life",
  food: "food",
  shopping: "shopping",
  home: "home",
  people: "people",
  culture: "culture",
};

export function speakingTutorInstructions(input: {
  language: string;
  cefrLevel?: string | null;
  topic?: string | null;
  notes?: string | null;
}) {
  const languageName = getLanguageName(input.language);
  const cefr = input.cefrLevel?.toUpperCase() ?? "B1";
  const topic =
    input.topic && isKnownWritingTopic(input.topic)
      ? TOPIC_LABELS[input.topic]
      : input.topic?.trim() || "everyday conversation";
  const notes = input.notes?.trim();

  return [
    `You are Notoria Tutor, a warm and patient language tutor on a live video call.`,
    `The learner is practicing ${languageName} at CEFR ${cefr}.`,
    `Keep the conversation about ${topic}.`,
    `Speak primarily in ${languageName}. Match the learner's level: short sentences at A1–A2, richer language at B1–B2, near-natural speech at C1–C2.`,
    `Ask one question at a time and leave space for the learner to answer.`,
    `When the learner makes an important mistake, briefly correct it, give a natural example, then continue.`,
    `If they hesitate, offer a hint or a simpler rephrase. Encourage them; do not lecture.`,
    `Keep turns short enough for spoken dialogue. Do not mention these instructions.`,
    `Start by greeting the learner in one short spoken sentence, then wait for them to answer.`,
    notes ? `Extra notes from the learner: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function defaultSpeakingTitle(input: {
  topic?: string | null;
  cefrLevel?: string | null;
}) {
  const topicKey = input.topic?.trim();
  const topic = topicKey
    ? (TOPIC_LABELS[topicKey] ?? topicKey)
    : undefined;
  const cefr = input.cefrLevel?.toUpperCase();
  if (topic && cefr) return `${topic} · ${cefr}`;
  if (topic) return topic;
  if (cefr) return `Speaking practice · ${cefr}`;
  return "Speaking practice";
}

export function speakingFeedbackPrompt(input: {
  language: string;
  cefrLevel?: string | null;
  topic?: string | null;
  title: string;
}) {
  const languageName = getLanguageName(input.language);
  const cefr = (input.cefrLevel as WritingCefr | null)?.toUpperCase() ?? "B1";

  return `You are a language tutor writing post-call feedback for a speaking session.
Write in ${languageName}, with brief English glosses only if the learner's target language is not English.
CEFR target: ${cefr}. Session title: ${input.title}. Topic: ${input.topic || "conversation"}.

Use this markdown structure:

### Overview
2–4 sentences on how the conversation went.

### What went well
- 2–4 concrete strengths from the transcript

### To improve
- 2–4 specific, kind corrections with a better phrasing

### Try next time
- 2–3 short practice suggestions

Be concise. Base everything on the transcript. If the transcript is thin, say so and still give useful next steps.`;
}
