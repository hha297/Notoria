import OpenAI from "openai";
import { ListeningError, toListeningError } from "@/lib/listening/errors";
import {
  splitListeningSentences,
  targetQuestionCount,
} from "@/lib/listening/select-type";
import {
  dialogueTurnsForPrompt,
  isMultiSpeakerTranscript,
} from "@/lib/listening/speakers";
import type { ListeningPracticeType, ListeningUtterance } from "@/lib/listening/types";
import { tokenizeSentence, transcriptContains } from "@/lib/listening/utils";
import {
  WRITING_TOPICS,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";
import {
  generatedFillBlankSetSchema,
  generatedMultipleChoiceSetSchema,
  listeningCefrSchema,
  listeningFormalitySchema,
  storedListeningExerciseSchema,
  type StoredListeningExercise,
} from "@/schemas/listening";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "and",
  "or",
]);

function asCefr(value: string | null | undefined): WritingCefr | null {
  if (!value) return null;
  const parsed = listeningCefrSchema.safeParse(value.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}

function asFormality(value: string | null | undefined): WritingFormality | null {
  if (!value) return null;
  const parsed = listeningFormalitySchema.safeParse(value.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}

function asTopic(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return (WRITING_TOPICS as readonly string[]).includes(lower) ? lower : trimmed;
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ListeningError("OPENAI_NOT_CONFIGURED");
  }

  return new OpenAI({ apiKey });
}

function blankGroundedInTranscript(blank: string, transcript: string) {
  if (transcriptContains(transcript, blank)) {
    return true;
  }

  const tokens = tokenizeSentence(blank).filter((token) => {
    const lower = token.toLocaleLowerCase();
    return lower.length > 1 && !STOP_WORDS.has(lower);
  });

  if (tokens.length === 0) {
    return false;
  }

  return tokens.every((token) => transcriptContains(transcript, token));
}

function answerGroundedInTranscript(
  answer: string,
  transcript: string,
  extraTerms: string[] = [],
) {
  const normalized = answer.trim().toLocaleLowerCase();
  if (
    extraTerms.some((term) => term.trim().toLocaleLowerCase() === normalized)
  ) {
    return true;
  }

  if (transcriptContains(transcript, answer) || blankGroundedInTranscript(answer, transcript)) {
    return true;
  }

  const tokens = tokenizeSentence(answer).filter((token) => token.length > 3);
  const haystack = transcript.toLocaleLowerCase();
  return tokens.length > 0 && tokens.some((token) => haystack.includes(token.toLocaleLowerCase()));
}

function unwrapGeneratedSet(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  if (Array.isArray(record.questions)) return raw;

  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && Array.isArray((value as { questions?: unknown }).questions)) {
      return { ...record, ...(value as object) };
    }
  }

  return raw;
}

function typeInstructions(
  type: ListeningPracticeType,
  min: number,
  target: number,
  max: number,
  durationSeconds: number,
  speakers: string[],
) {
  const isDialogue = speakers.length > 1;
  const speakerA = speakers[0] ?? "Speaker A";
  const speakerB = speakers[1] ?? "Speaker B";
  const pace = `Audio length is about ${durationSeconds} seconds. Create about one question every 10-20 seconds, targeting ${target} questions (minimum ${min}, maximum ${max}).`;

  if (type === "FILL_BLANK") {
    return {
      summary: `Generate ${target} fill-in-the-blank questions from the transcript.`,
      output: {
        type: "FILL_BLANK",
        title: "string",
        questions: [
          isDialogue
            ? {
                speaker: speakerA,
                sentenceWithBlanks: "I'm still ______.",
                blanks: ["hungry"],
              }
            : {
                sentenceWithBlanks: "I'm still ______.",
                blanks: ["hungry"],
              },
        ],
      },
      rules: [
        pace,
        `You MUST generate at least ${min} questions and should generate ${target}. Do not stop at 2-5 questions.`,
        "Split the transcript into many short questions. One sentence = one question.",
        "Prefer exactly 1 blank per question so there are more questions. Use 2 blanks only when the sentence is long.",
        "Do not combine several sentences into one item.",
        "Do not show the full transcript as a single item.",
        "Blank useful vocabulary, names, numbers, expressions, or grammar — not random function words.",
        "Use ______ for every blank.",
        "Every blank answer must appear in the original transcript.",
        "Cover the transcript from beginning to end.",
        "Do not rewrite, translate, or summarize the spoken text.",
        ...(isDialogue
          ? [
              `This is a multi-speaker dialogue. The speakers in THIS audio are: ${speakers.join(", ")}.`,
              "Use only those speaker labels. Never invent other personal names.",
              "Include the speaker display name on each question.",
              "Keep each question as one speaker turn. Do not merge turns from different speakers.",
            ]
          : []),
        "Do not generate multiple choice, dictation, or word ordering.",
      ],
    };
  }

  const dialogueOptions = isDialogue
    ? [
        speakerA,
        speakerB,
        speakers[2] ?? "Speaker C",
        "Nobody in this audio",
      ].filter((option, index, list) => list.indexOf(option) === index)
    : [];
  while (dialogueOptions.length < 4) {
    dialogueOptions.push(`Speaker ${String.fromCharCode(65 + dialogueOptions.length)}`);
  }

  return {
    summary: `Generate ${target} multiple-choice questions from the transcript.`,
    output: {
      type: "MULTIPLE_CHOICE",
      title: "string",
      questions: [
        isDialogue
          ? {
              question: `What does ${speakerA} say first?`,
              options: dialogueOptions.slice(0, 4),
              correctAnswer: speakerA,
            }
          : {
              question: "Why is the speaker going to the restaurant?",
              options: [
                "Because he is hungry",
                "Because he wants to work",
                "Because he wants to sleep",
                "Because he has a meeting",
              ],
              correctAnswer: "Because he is hungry",
            },
      ],
    },
    rules: [
      pace,
      `You MUST generate at least ${min} questions and should generate ${target}. Do not stop at 2-5 questions.`,
      "Ask about details throughout the audio: who, what, where, when, why, numbers, and key vocabulary.",
      "Cover the transcript from beginning to end. Do not only ask about the opening lines.",
      "Every question must be multiple choice with exactly 4 distinct options.",
      "Every correct answer must be grounded in the transcript.",
      "Do not invent details that are not in the audio.",
      "Do not rewrite, translate, or summarize the spoken text.",
      ...(isDialogue
        ? [
            `Use only the speakers from THIS audio: ${speakers.join(", ")}.`,
            "Never invent personal names that are not in the provided dialogue.",
            "Ask who said what, and what one speaker says after another.",
          ]
        : []),
      "Do not generate fill-in-the-blank, dictation, or word ordering.",
    ],
  };
}

function toStoredSet(
  type: ListeningPracticeType,
  raw: unknown,
  transcript: string,
  extraTerms: string[] = [],
): {
  title: string;
  cefrLevel?: string | null;
  topic?: string | null;
  formality?: string | null;
  exercises: StoredListeningExercise[];
} | null {
  const unwrapped = unwrapGeneratedSet(raw);

  if (type === "FILL_BLANK") {
    const parsed = generatedFillBlankSetSchema.safeParse(unwrapped);
    if (!parsed.success) return null;

    const exercises = parsed.data.questions.flatMap((question) => {
      const groundedBlanks = question.blanks.filter(
        (blank) =>
          blankGroundedInTranscript(blank, transcript) ||
          extraTerms.some(
            (term) => term.toLocaleLowerCase() === blank.toLocaleLowerCase(),
          ),
      );
      if (groundedBlanks.length === 0) return [];
      if (groundedBlanks.length !== question.blanks.length) return [];

      const stored = storedListeningExerciseSchema.safeParse({
        type: "FILL_BLANK",
        question: question.sentenceWithBlanks,
        data: {
          sentenceWithBlanks: question.sentenceWithBlanks,
          speaker: question.speaker?.trim() || undefined,
        },
        correctAnswer: question.blanks,
      });
      return stored.success ? [stored.data] : [];
    });

    if (exercises.length === 0) return null;
    return { ...parsed.data, exercises };
  }

  const parsed = generatedMultipleChoiceSetSchema.safeParse(unwrapped);
  if (!parsed.success) return null;

  const exercises = parsed.data.questions.flatMap((question) => {
    if (!answerGroundedInTranscript(question.correctAnswer, transcript, extraTerms)) {
      return [];
    }
    const canonical =
      question.options.find(
        (option) =>
          option.toLocaleLowerCase() === question.correctAnswer.toLocaleLowerCase(),
      ) ?? question.correctAnswer;
    const stored = storedListeningExerciseSchema.safeParse({
      type: "MULTIPLE_CHOICE",
      question: question.question,
      data: { options: question.options },
      correctAnswer: canonical,
    });
    return stored.success ? [stored.data] : [];
  });

  if (exercises.length === 0) return null;
  return { ...parsed.data, exercises };
}

function mergeExercises(
  current: StoredListeningExercise[],
  extra: StoredListeningExercise[],
  max: number,
) {
  const seen = new Set(current.map((exercise) => exercise.question.toLocaleLowerCase()));
  const merged = [...current];

  for (const exercise of extra) {
    const key = exercise.question.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(exercise);
    if (merged.length >= max) break;
  }

  return merged;
}

async function requestExerciseJson(input: {
  client: OpenAI;
  transcript: string;
  sentences: string[];
  dialogue: ReturnType<typeof dialogueTurnsForPrompt>;
  exerciseType: ListeningPracticeType;
  language?: string | null;
  cefrLevel?: WritingCefr | null;
  topic?: string | null;
  formality?: WritingFormality | null;
  fallbackTitle: string;
  min: number;
  target: number;
  max: number;
  durationSeconds: number;
  extraInstruction?: string;
}) {
  const speakers = [
    ...new Set(
      input.dialogue
        .map((turn) => turn.displayName)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const isDialogue = new Set(input.dialogue.map((turn) => turn.speaker)).size > 1;
  const instructions = typeInstructions(
    input.exerciseType,
    input.min,
    input.target,
    input.max,
    input.durationSeconds,
    speakers,
  );

  const completion = await input.client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 8000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a language-learning content designer for Notoria Listening lessons.
Create one Listening exercise SET of a single type.

Rules:
- Every item must be ${input.exerciseType}. Never mix types.
- Preserve the meaning of the original transcript. Never rewrite, translate, or summarize it.
- Do not invent facts, names, places, or details that are not in the transcript.
- Every correct answer must come from the transcript.
- Prefer useful vocabulary and grammar for the given CEFR level.
- Each question must have one clearly correct answer.
- Avoid ambiguous questions, duplicate options, and meaningless distractors.
- Split content into many short questions instead of a few broad ones.
- Return JSON only.
${instructions.rules.map((rule) => `- ${rule}`).join("\n")}${
          input.extraInstruction ? `\n- ${input.extraInstruction}` : ""
        }`,
      },
      {
        role: "user",
        content: JSON.stringify({
          transcript: input.transcript,
          sentences: input.sentences.map((sentence, index) => ({
            index: index + 1,
            text: sentence,
          })),
          dialogue: isDialogue ? input.dialogue : undefined,
          language: input.language ?? null,
          cefrLevel: input.cefrLevel ?? null,
          topic: input.topic ?? null,
          formality: input.formality ?? null,
          fallbackTitle: input.fallbackTitle,
          requiredType: input.exerciseType,
          audioDurationSeconds: input.durationSeconds,
          targetQuestionCount: {
            min: input.min,
            target: input.target,
            max: input.max,
          },
          instructions,
        }),
      },
    ],
  });

  return completion.choices[0]?.message?.content;
}

export async function generateListeningExercisesFromTranscript(input: {
  transcript: string;
  exerciseType: ListeningPracticeType;
  durationSeconds?: number | null;
  utterances?: ListeningUtterance[];
  language?: string | null;
  cefrLevel?: WritingCefr | null;
  topic?: string | null;
  formality?: WritingFormality | null;
  fallbackTitle: string;
}): Promise<{
  title: string;
  exerciseType: ListeningPracticeType;
  cefrLevel: WritingCefr | null;
  topic: string | null;
  formality: WritingFormality | null;
  exercises: StoredListeningExercise[];
}> {
  const client = getOpenAIClient();
  const transcript = input.transcript.trim();

  if (!transcript) {
    throw new ListeningError("EMPTY_TRANSCRIPT");
  }

  const utterances = input.utterances ?? [];
  const isDialogue = isMultiSpeakerTranscript(utterances);
  const dialogue = isDialogue ? dialogueTurnsForPrompt(utterances) : [];
  const extraTerms = [
    ...new Set(
      dialogue.flatMap((turn) =>
        turn.displayName ? [turn.displayName, `Speaker ${turn.speaker}`] : [`Speaker ${turn.speaker}`],
      ),
    ),
  ];

  const { min, max, target } = targetQuestionCount({
    transcript,
    durationSeconds: input.durationSeconds,
  });
  const durationSeconds =
    input.durationSeconds && input.durationSeconds > 0
      ? input.durationSeconds
      : Math.round(target * 12);
  const sentences = isDialogue
    ? dialogue.map((turn) => `${turn.displayName}: ${turn.text}`)
    : splitListeningSentences(transcript);
  const exerciseType = input.exerciseType;

  const requestInput = {
    client,
    transcript,
    sentences,
    dialogue,
    exerciseType,
    language: input.language,
    cefrLevel: input.cefrLevel,
    topic: input.topic,
    formality: input.formality,
    fallbackTitle: input.fallbackTitle,
    min,
    target,
    max,
    durationSeconds,
  };

  let content: string | null | undefined;

  try {
    content = await requestExerciseJson(requestInput);
  } catch (error) {
    throw toListeningError(error);
  }

  if (!content) {
    throw new ListeningError("GENERATION_FAILED");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new ListeningError("VALIDATION_FAILED");
  }

  let stored = toStoredSet(exerciseType, parsedJson, transcript, extraTerms);
  if (!stored || stored.exercises.length === 0) {
    throw new ListeningError("VALIDATION_FAILED");
  }

  if (stored.exercises.length < min) {
    const needed = Math.max(1, target - stored.exercises.length);
    const existingQuestions = stored.exercises.map((exercise) => exercise.question);

    try {
      const extraContent = await requestExerciseJson({
        ...requestInput,
        extraInstruction: `The first pass only produced ${stored.exercises.length} usable questions. Generate ${needed} additional NEW questions from uncovered parts of the transcript. Do not repeat these existing questions: ${JSON.stringify(existingQuestions)}`,
      });

      if (extraContent) {
        const extraJson = JSON.parse(extraContent) as unknown;
        const extraStored = toStoredSet(exerciseType, extraJson, transcript, extraTerms);
        if (extraStored) {
          stored = {
            ...stored,
            exercises: mergeExercises(stored.exercises, extraStored.exercises, max),
          };
        }
      }
    } catch {
      // Keep the first usable set if the follow-up call fails.
    }
  }

  if (stored.exercises.some((exercise) => exercise.type !== exerciseType)) {
    throw new ListeningError("VALIDATION_FAILED");
  }

  return {
    title: stored.title || input.fallbackTitle,
    exerciseType,
    cefrLevel: input.cefrLevel ?? asCefr(stored.cefrLevel),
    topic: input.topic ?? asTopic(stored.topic),
    formality: input.formality ?? asFormality(stored.formality),
    exercises: stored.exercises,
  };
}
