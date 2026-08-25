import { NextResponse } from "next/server";
import { z } from "zod";
import { AiAccessError, requireAiAccess } from "@/lib/auth/ai-access";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getTheoryNote } from "@/lib/actions/theory";
import { generateAiTheoryExercises } from "@/lib/theory-exercises/ai";
import { parseTheoryContent } from "@/lib/theory/content";
import { getActiveWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

const bodySchema = z.object({
  theoryId: z.string().min(1),
  count: z.number().int().min(1).max(30).optional(),
});

export async function POST(request: Request) {
  try {
    await requireAiAccess();
  } catch (error) {
    if (error instanceof AiAccessError) {
      return NextResponse.json({ ok: false, code: "AI_FORBIDDEN" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, code: "AI_FORBIDDEN" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, code: "AI_UNAVAILABLE" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "AI_INVALID_REQUEST" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "AI_INVALID_REQUEST" }, { status: 400 });
  }

  const note = await getTheoryNote(parsed.data.theoryId);
  if (!note) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const content = parseTheoryContent(note.content);
    const words = await getFlashcardWords();
    const workspace = await getActiveWorkspace();
    const exercises = await generateAiTheoryExercises({
      theoryId: note.id,
      theoryTitle: note.title,
      doc: content.doc,
      vocabulary: words.map((w) => ({
        id: w.id,
        word: w.word,
        partOfSpeech: w.partOfSpeech,
      })),
      count: parsed.data.count,
      studyLanguage: workspace?.language,
    });
    return NextResponse.json({ ok: true, exercises });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OPENAI_NOT_CONFIGURED" || message === "AI_INVALID_RESPONSE") {
      console.error("theory exercise AI failed", message);
    } else {
      console.error("theory exercise AI failed");
    }
    return NextResponse.json({ ok: false, code: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
