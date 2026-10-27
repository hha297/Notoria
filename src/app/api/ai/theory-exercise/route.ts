import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { authErrorResponse } from "@/lib/auth/http";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getTheoryNote } from "@/lib/actions/theory";
import { generateAiTheoryExercises } from "@/lib/theory-exercises/ai";
import { parseTheoryContent } from "@/lib/theory/content";
import { locales } from "@/i18n/config";
import { uiLocaleEnglishName } from "@/lib/i18n/ui-locales";
import { getActiveWorkspace } from "@/lib/workspace";
import { gateAdditionalInstructions } from "@/lib/exercises/additional-instructions-server";
import { exerciseNextSetMetaSchema } from "@/lib/exercises/ai-types";
import {
  exerciseJobInProgressResponse,
  runExclusiveExerciseGeneration,
} from "@/lib/exercises/next-set-job";
import { DEFAULT_NEXT_SET_COUNT } from "@/lib/exercises/next-set-fingerprint";
import { theoryQuestionTypeSchema } from "@/lib/theory-exercises/question-type";

export const runtime = "nodejs";
/** Match `AI_DEADLINES_MS.theoryGenerate` with a little headroom. */
export const maxDuration = 120;

const bodySchema = z.object({
  theoryId: z.string().min(1),
  count: z.number().int().min(1).max(30).optional(),
  /** Website UI locale for sentenceMeaning. */
  uiLocale: z.enum(locales).optional(),
  additionalInstructions: z.string().trim().max(2_000).optional().nullable(),
  questionType: theoryQuestionTypeSchema.optional().default("fill_blank"),
  nextSet: exerciseNextSetMetaSchema.optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const note = await getTheoryNote(parsed.data.theoryId);
  if (!note) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }

  let user;
  try {
    user = await getCurrentUserRecord();
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "Authentication required" },
      { status: 401 },
    );
  }

  const gated = await gateAdditionalInstructions(parsed.data.additionalInstructions);
  if (!gated.ok) {
    return NextResponse.json({ ok: false, code: gated.code }, { status: 403 });
  }

  const nextSet = parsed.data.nextSet;
  const sessionId = nextSet?.sessionId ?? `oneshot-${user.id}`;
  const sequence = nextSet?.sequence ?? 0;
  const count = parsed.data.count ?? DEFAULT_NEXT_SET_COUNT;
  const revision =
    note.updatedAt instanceof Date
      ? note.updatedAt.toISOString()
      : String(note.updatedAt ?? "");

  try {
    const outcome = await runExclusiveExerciseGeneration({
      userId: user.id,
      regenerate: nextSet?.regenerate === true,
      fingerprint: {
        kind: "theory",
        sessionId,
        sourceIds: [note.id],
        sourceRevisions: [revision],
        mode: `theory:${parsed.data.questionType}`,
        difficulty: null,
        language: null,
        uiLocale: parsed.data.uiLocale ?? null,
        count,
        additionalInstructions: gated.text,
        sequence,
      },
      generate: async () => {
        const content = parseTheoryContent(note.content);
        const words = await getFlashcardWords();
        const workspace = await getActiveWorkspace();
        const uiLocale = parsed.data.uiLocale ?? "en";
        return generateAiTheoryExercises({
          theoryId: note.id,
          theoryTitle: note.title,
          doc: content.doc,
          vocabulary: words.map((w) => ({
            id: w.id,
            word: w.word,
            partOfSpeech: w.partOfSpeech,
            tags: w.tags,
          })),
          count,
          studyLanguage: workspace?.language,
          uiLanguage: uiLocaleEnglishName(uiLocale),
          additionalInstructions: gated.text,
          questionType: parsed.data.questionType,
        });
      },
    });

    if (outcome.status === "blocked") return outcome.response;
    if (outcome.status === "in_progress") {
      return exerciseJobInProgressResponse();
    }

    return NextResponse.json({
      ok: true,
      exercises: outcome.result,
      reused: outcome.duplicate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message === "OPENAI_NOT_CONFIGURED" ||
      message === "AI_INVALID_RESPONSE"
    ) {
      console.error("theory exercise AI failed", message);
    } else {
      console.error("theory exercise AI failed");
    }
    return NextResponse.json(
      { ok: false, code: "AI_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
