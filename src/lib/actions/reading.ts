"use server";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  readingAnswers,
  readingAttempts,
  readingPassages,
  readingQuestions,
  readingQuestionSets,
  workspaceFolders,
} from "@/db/schema";
import {
  AiAssistanceDisabledError,
  requireAiAssistanceEnabled,
} from "@/lib/ai/preferences-server";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getCurrentUserId } from "@/lib/auth/session";
import { consumeUsage } from "@/lib/billing/entitlements";
import { QuotaExceededError } from "@/lib/billing/errors";
import {
  finalizeUsageReservation,
  refundUsageReservation,
} from "@/lib/billing/usage";
import { ReadingError, toReadingError } from "@/lib/reading/errors";
import { generateReadingQuestions } from "@/lib/reading/generate";
import { gradeObjectiveAnswer, gradeWrittenAnswers } from "@/lib/reading/grade";
import {
  toPracticePayload,
  toReadingPassageDetail,
  toReadingPassageListItem,
  toReadingQuestionSetSummary,
} from "@/lib/reading/serialize";
import type {
  ReadingPassageDetail,
  ReadingPassageListItem,
  ReadingPracticePayload,
  ReadingQuestionSetSummary,
} from "@/lib/reading/types";
import {
  normalizePassageTitle,
  titleFromFilename,
  validatePassageBody,
} from "@/lib/reading/utils";
import { requireActiveWorkspace } from "@/lib/workspace";
import {
  createReadingPassageSchema,
  generateReadingExercisesSchema,
  saveReadingAnswerSchema,
  saveReadingAnswersSchema,
  submitReadingAttemptSchema,
  updateReadingPassageSchema,
} from "@/schemas/reading";

function revalidateReading(passageId?: string, setId?: string) {
  revalidatePath("/reading");
  if (passageId) {
    revalidatePath(`/reading/${passageId}`);
    revalidatePath(`/reading/${passageId}/practice`);
  }
  if (passageId && setId) {
    revalidatePath(`/reading/${passageId}/practice/${setId}`);
  }
}

function mapUsageError(error: unknown): never {
  if (error instanceof QuotaExceededError) {
    throw new ReadingError("AI_QUOTA_EXCEEDED");
  }
  if (error instanceof AiAssistanceDisabledError) {
    throw new ReadingError("AI_DISABLED");
  }
  throw error;
}

async function requireOwnedPassage(passageId: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const passage = await db.query.readingPassages.findFirst({
    where: and(
      eq(readingPassages.id, passageId),
      eq(readingPassages.userId, userId),
      eq(readingPassages.workspaceId, workspace.id),
    ),
  });
  if (!passage) throw new ReadingError("PASSAGE_NOT_FOUND");
  return { userId, workspace, passage };
}

export async function listReadingPassages(): Promise<ReadingPassageListItem[]> {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const rows = await db
    .select({
      passage: readingPassages,
      questionSetCount: sql<number>`coalesce(count(${readingQuestionSets.id}), 0)`.mapWith(
        Number,
      ),
      latestSetStatus: sql<string | null>`(
        select ${readingQuestionSets.status}
        from ${readingQuestionSets}
        where ${readingQuestionSets.passageId} = ${readingPassages.id}
        order by ${readingQuestionSets.createdAt} desc
        limit 1
      )`,
    })
    .from(readingPassages)
    .leftJoin(
      readingQuestionSets,
      eq(readingQuestionSets.passageId, readingPassages.id),
    )
    .where(
      and(
        eq(readingPassages.userId, userId),
        eq(readingPassages.workspaceId, workspace.id),
      ),
    )
    .groupBy(readingPassages.id)
    .orderBy(desc(readingPassages.updatedAt));

  return rows.map((row) =>
    toReadingPassageListItem({
      ...row.passage,
      questionSetCount: row.questionSetCount,
      latestSetStatus: row.latestSetStatus,
    }),
  );
}

/** @deprecated Prefer listReadingPassages */
export async function getReadingPassages() {
  return listReadingPassages();
}

export async function getReadingPassage(
  id: string,
): Promise<ReadingPassageDetail> {
  const { passage } = await requireOwnedPassage(id);

  const sets = await db.query.readingQuestionSets.findMany({
    where: eq(readingQuestionSets.passageId, passage.id),
    orderBy: [desc(readingQuestionSets.createdAt)],
  });

  return toReadingPassageDetail({
    ...passage,
    questionSets: sets,
  });
}

export async function createReadingPassage(input: {
  title?: string;
  body: string;
  language: string;
  sourceType?: "paste" | "pdf" | "docx";
  sourceFilename?: string | null;
  folderId?: string | null;
}) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const parsed = createReadingPassageSchema.parse(input);
  const validated = validatePassageBody(parsed.body);
  if (!validated.ok) {
    throw new ReadingError(validated.code);
  }

  let folderId: string | null = null;
  if (input.folderId) {
    const folder = await db.query.workspaceFolders.findFirst({
      where: and(
        eq(workspaceFolders.id, input.folderId),
        eq(workspaceFolders.userId, userId),
        eq(workspaceFolders.workspaceId, workspace.id),
        eq(workspaceFolders.section, "reading"),
      ),
    });
    folderId = folder?.id ?? null;
  }

  const [row] = await db
    .insert(readingPassages)
    .values({
      userId,
      workspaceId: workspace.id,
      title: normalizePassageTitle(parsed.title, validated.normalized),
      body: validated.normalized,
      language: parsed.language.trim(),
      sourceType: parsed.sourceType ?? "paste",
      sourceFilename: parsed.sourceFilename ?? null,
      wordCount: validated.wordCount,
      contentVersion: 1,
      folderId,
    })
    .returning();

  revalidateReading(row.id);
  return toReadingPassageListItem({
    ...row,
    questionSetCount: 0,
    latestSetStatus: null,
  });
}

export async function extractReadingUpload(formData: FormData) {
  await getCurrentUserId();
  await requireActiveWorkspace();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new ReadingError("INVALID_FILE");

  // Lazy-load so practice/detail pages never pull native canvas into the RSC graph.
  const { extractReadingDocument } = await import("@/lib/reading/extract");

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractReadingDocument({
    buffer,
    mimeType: file.type || "application/octet-stream",
    filename: file.name,
  });

  const validated = validatePassageBody(extracted.text);
  const body = validated.normalized || extracted.text;
  const title = extracted.suggestedTitle || titleFromFilename(file.name);
  return {
    title,
    body,
    /** Aliases for callers that expect extractReadingDocument shape. */
    suggestedTitle: title,
    text: body,
    sourceType: extracted.sourceType,
    sourceFilename: extracted.sourceFilename,
    wordCount: validated.wordCount || extracted.wordCount,
    valid: validated.ok,
    errorCode: validated.ok ? null : validated.code,
  };
}

export async function updateReadingPassage(
  id: string,
  input: { title: string; body: string; language: string },
) {
  const { passage } = await requireOwnedPassage(id);
  const parsed = updateReadingPassageSchema.parse(input);
  const validated = validatePassageBody(parsed.body);
  if (!validated.ok) {
    throw new ReadingError(validated.code);
  }

  const bodyChanged = validated.normalized !== passage.body;
  const [row] = await db
    .update(readingPassages)
    .set({
      title: normalizePassageTitle(parsed.title, validated.normalized),
      body: validated.normalized,
      language: parsed.language.trim(),
      wordCount: validated.wordCount,
      contentVersion: bodyChanged
        ? passage.contentVersion + 1
        : passage.contentVersion,
      updatedAt: new Date(),
    })
    .where(eq(readingPassages.id, id))
    .returning();

  revalidateReading(id);
  return toReadingPassageListItem({
    ...row,
    questionSetCount: undefined,
    latestSetStatus: null,
  });
}

export async function deleteReadingPassage(id: string) {
  const { passage } = await requireOwnedPassage(id);
  await db.delete(readingPassages).where(eq(readingPassages.id, passage.id));
  revalidateReading(id);
  return { ok: true as const };
}

export async function generateReadingQuestionSet(input: {
  passageId: string;
  exerciseMode: "multiple_choice" | "written" | "true_false_not_stated" | "mixed";
  questionCount: 5 | 10 | 15 | 20;
  questionLanguage: string;
  difficulty?: string | null;
}): Promise<ReadingQuestionSetSummary> {
  const parsed = generateReadingExercisesSchema.parse(input);
  const { userId, workspace, passage } = await requireOwnedPassage(
    parsed.passageId,
  );

  try {
    await requireAiAssistanceEnabled();
  } catch (error) {
    mapUsageError(error);
  }

  let reservationId: string | null = null;
  try {
    const user = await getCurrentUserRecord();
    if (!user) throw new ReadingError("UNAUTHORIZED");
    const usage = await consumeUsage(user, "ai_reading");
    reservationId = usage.reservationId;
  } catch (error) {
    mapUsageError(error);
  }

  const [setRow] = await db
    .insert(readingQuestionSets)
    .values({
      passageId: passage.id,
      userId,
      workspaceId: workspace.id,
      passageContentVersion: passage.contentVersion,
      exerciseMode: parsed.exerciseMode,
      questionCount: parsed.questionCount,
      questionLanguage: parsed.questionLanguage,
      difficulty: parsed.difficulty ?? null,
      status: "generating",
    })
    .returning();

  try {
    const questions = await generateReadingQuestions({
      title: passage.title,
      body: passage.body,
      passageLanguage: passage.language,
      questionLanguage: parsed.questionLanguage,
      exerciseMode: parsed.exerciseMode,
      questionCount: parsed.questionCount,
      difficulty: parsed.difficulty ?? null,
    });

    if (questions.length > 0) {
      await db.insert(readingQuestions).values(
        questions.map((q, index) => ({
          setId: setRow.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          correctAnswer: q.correctAnswer,
          keyPoints: q.keyPoints,
          explanation: q.explanation,
          excerpt: q.excerpt,
          excerptStart: q.excerptStart,
          excerptEnd: q.excerptEnd,
          sortOrder: index,
        })),
      );
    }

    const [ready] = await db
      .update(readingQuestionSets)
      .set({
        status: "ready",
        questionCount: questions.length,
        errorCode: null,
      })
      .where(eq(readingQuestionSets.id, setRow.id))
      .returning();

    await finalizeUsageReservation(reservationId);
    revalidateReading(passage.id, ready.id);
    return toReadingQuestionSetSummary(ready);
  } catch (error) {
    await refundUsageReservation(reservationId);
    const readingError = toReadingError(error);
    await db
      .update(readingQuestionSets)
      .set({ status: "failed", errorCode: readingError.code })
      .where(eq(readingQuestionSets.id, setRow.id));
    revalidateReading(passage.id, setRow.id);
    throw readingError;
  }
}

/** @deprecated Prefer startOrResumeReadingAttempt */
export async function startReadingAttempt(setId: string) {
  const payload = await startOrResumeReadingAttempt(setId);
  return payload.attempt;
}

export async function startOrResumeReadingAttempt(
  setId: string,
): Promise<ReadingPracticePayload> {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const set = await db.query.readingQuestionSets.findFirst({
    where: and(
      eq(readingQuestionSets.id, setId),
      eq(readingQuestionSets.userId, userId),
      eq(readingQuestionSets.workspaceId, workspace.id),
    ),
  });
  if (!set) throw new ReadingError("SET_NOT_FOUND");
  if (set.status !== "ready") throw new ReadingError("SET_NOT_READY");

  const passage = await db.query.readingPassages.findFirst({
    where: eq(readingPassages.id, set.passageId),
  });
  if (!passage) throw new ReadingError("PASSAGE_NOT_FOUND");

  const questions = await db.query.readingQuestions.findMany({
    where: eq(readingQuestions.setId, set.id),
    orderBy: [asc(readingQuestions.sortOrder)],
  });

  let attempt = await db.query.readingAttempts.findFirst({
    where: and(
      eq(readingAttempts.setId, set.id),
      eq(readingAttempts.userId, userId),
      eq(readingAttempts.status, "in_progress"),
    ),
    orderBy: [desc(readingAttempts.startedAt)],
  });

  if (!attempt) {
    // Prefer the latest finished attempt so refresh keeps results visible.
    const latest = await db.query.readingAttempts.findFirst({
      where: and(
        eq(readingAttempts.setId, set.id),
        eq(readingAttempts.userId, userId),
      ),
      orderBy: [desc(readingAttempts.startedAt)],
    });

    if (
      latest &&
      (latest.status === "graded" ||
        latest.status === "grading" ||
        latest.status === "grading_failed" ||
        latest.status === "submitted")
    ) {
      attempt = latest;
    } else {
      const [created] = await db
        .insert(readingAttempts)
        .values({
          setId: set.id,
          userId,
          status: "in_progress",
        })
        .returning();
      attempt = created;
    }
  }

  const answers = await db.query.readingAnswers.findMany({
    where: eq(readingAnswers.attemptId, attempt.id),
  });

  const revealed = !["in_progress"].includes(attempt.status);

  return toPracticePayload({
    passage,
    set,
    questions,
    attempt,
    answers,
    revealed,
  });
}

async function upsertReadingAnswer(input: {
  attemptId: string;
  setId: string;
  questionId: string;
  response: unknown;
}) {
  const question = await db.query.readingQuestions.findFirst({
    where: and(
      eq(readingQuestions.id, input.questionId),
      eq(readingQuestions.setId, input.setId),
    ),
  });
  if (!question) throw new ReadingError("SET_NOT_FOUND");

  const existing = await db.query.readingAnswers.findFirst({
    where: and(
      eq(readingAnswers.attemptId, input.attemptId),
      eq(readingAnswers.questionId, question.id),
    ),
  });

  if (existing) {
    await db
      .update(readingAnswers)
      .set({
        response: input.response as object,
        updatedAt: new Date(),
      })
      .where(eq(readingAnswers.id, existing.id));
  } else {
    await db.insert(readingAnswers).values({
      attemptId: input.attemptId,
      questionId: question.id,
      response: input.response as object,
    });
  }
}

export async function saveReadingAnswer(input: {
  attemptId: string;
  questionId: string;
  response: unknown;
}) {
  const userId = await getCurrentUserId();
  const parsed = saveReadingAnswerSchema.parse(input);

  const attempt = await db.query.readingAttempts.findFirst({
    where: and(
      eq(readingAttempts.id, parsed.attemptId),
      eq(readingAttempts.userId, userId),
    ),
  });
  if (!attempt) throw new ReadingError("ATTEMPT_NOT_FOUND");
  if (attempt.status !== "in_progress") {
    throw new ReadingError("ATTEMPT_NOT_EDITABLE");
  }

  await upsertReadingAnswer({
    attemptId: attempt.id,
    setId: attempt.setId,
    questionId: parsed.questionId,
    response: parsed.response,
  });

  await db
    .update(readingAttempts)
    .set({ updatedAt: new Date() })
    .where(eq(readingAttempts.id, attempt.id));

  return { ok: true as const };
}

export async function saveReadingAnswers(input: {
  attemptId: string;
  answers: Array<{ questionId: string; response: unknown }>;
}) {
  const userId = await getCurrentUserId();
  const parsed = saveReadingAnswersSchema.parse(input);

  const attempt = await db.query.readingAttempts.findFirst({
    where: and(
      eq(readingAttempts.id, parsed.attemptId),
      eq(readingAttempts.userId, userId),
    ),
  });
  if (!attempt) throw new ReadingError("ATTEMPT_NOT_FOUND");
  if (attempt.status !== "in_progress") {
    throw new ReadingError("ATTEMPT_NOT_EDITABLE");
  }

  for (const answer of parsed.answers) {
    await upsertReadingAnswer({
      attemptId: attempt.id,
      setId: attempt.setId,
      questionId: answer.questionId,
      response: answer.response,
    });
  }

  await db
    .update(readingAttempts)
    .set({ updatedAt: new Date() })
    .where(eq(readingAttempts.id, attempt.id));

  return { ok: true as const };
}

export async function submitReadingAttempt(
  input: string | { attemptId: string; answers?: Array<{ questionId: string; response: unknown }> },
): Promise<ReadingPracticePayload> {
  const parsed =
    typeof input === "string"
      ? { attemptId: input, answers: [] as Array<{ questionId: string; response: unknown }> }
      : submitReadingAttemptSchema.parse(input);

  const userId = await getCurrentUserId();
  const attempt = await db.query.readingAttempts.findFirst({
    where: and(
      eq(readingAttempts.id, parsed.attemptId),
      eq(readingAttempts.userId, userId),
    ),
  });
  if (!attempt) throw new ReadingError("ATTEMPT_NOT_FOUND");
  if (attempt.status !== "in_progress") {
    throw new ReadingError("ATTEMPT_NOT_EDITABLE");
  }

  if (parsed.answers.length > 0) {
    for (const answer of parsed.answers) {
      await upsertReadingAnswer({
        attemptId: attempt.id,
        setId: attempt.setId,
        questionId: answer.questionId,
        response: answer.response,
      });
    }
  }

  const set = await db.query.readingQuestionSets.findFirst({
    where: eq(readingQuestionSets.id, attempt.setId),
  });
  if (!set) throw new ReadingError("SET_NOT_FOUND");

  const passage = await db.query.readingPassages.findFirst({
    where: eq(readingPassages.id, set.passageId),
  });
  if (!passage) throw new ReadingError("PASSAGE_NOT_FOUND");

  const questions = await db.query.readingQuestions.findMany({
    where: eq(readingQuestions.setId, set.id),
    orderBy: [asc(readingQuestions.sortOrder)],
  });
  const answers = await db.query.readingAnswers.findMany({
    where: eq(readingAnswers.attemptId, attempt.id),
  });
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  let objectiveCorrect = 0;
  let objectiveTotal = 0;
  const writtenItems: Array<{
    questionId: string;
    prompt: string;
    keyPoints: string[] | null;
    response: unknown;
    explanation: string | null;
    excerpt: string | null;
  }> = [];

  for (const question of questions) {
    const answer = answerByQuestion.get(question.id);
    if (question.type === "written") {
      const responseText =
        typeof answer?.response === "object" &&
        answer.response &&
        "value" in answer.response
          ? String((answer.response as { value: unknown }).value ?? "")
          : typeof answer?.response === "string"
            ? answer.response
            : "";
      writtenItems.push({
        questionId: question.id,
        prompt: question.prompt,
        keyPoints: Array.isArray(question.keyPoints)
          ? (question.keyPoints as string[])
          : null,
        response: responseText,
        explanation: question.explanation,
        excerpt: question.excerpt,
      });
      continue;
    }

    objectiveTotal += 1;
    if (!answer) continue;
    const correct = gradeObjectiveAnswer({
      type: question.type,
      correctAnswer: question.correctAnswer,
      response: answer.response,
    });
    if (correct) objectiveCorrect += 1;
    await db
      .update(readingAnswers)
      .set({
        isCorrect: correct,
        gradedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(readingAnswers.id, answer.id));
  }

  await db
    .update(readingAttempts)
    .set({
      status: writtenItems.length > 0 ? "grading" : "graded",
      submittedAt: new Date(),
      objectiveCorrect,
      objectiveTotal,
      updatedAt: new Date(),
    })
    .where(eq(readingAttempts.id, attempt.id));

  if (writtenItems.length > 0) {
    try {
      try {
        await requireAiAssistanceEnabled();
      } catch (error) {
        mapUsageError(error);
      }

      let reservationId: string | null = null;
      try {
        const user = await getCurrentUserRecord();
        if (!user) throw new ReadingError("UNAUTHORIZED");
        const usage = await consumeUsage(user, "ai_reading");
        reservationId = usage.reservationId;
      } catch (error) {
        mapUsageError(error);
      }

      try {
        const grades = await gradeWrittenAnswers({
          passageTitle: passage.title,
          passageBody: passage.body,
          questionLanguage: set.questionLanguage,
          items: writtenItems.filter(
            (item) =>
              typeof item.response === "string" &&
              item.response.trim().length > 0,
          ),
        });
        const gradeById = new Map(grades.map((g) => [g.questionId, g]));

        for (const item of writtenItems) {
          const answer = answerByQuestion.get(item.questionId);
          if (!answer) continue;
          const grade = gradeById.get(item.questionId);
          await db
            .update(readingAnswers)
            .set({
              feedback: grade?.feedback ?? {
                summary: "No answer provided.",
              },
              isCorrect: grade?.isCorrect ?? false,
              gradedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(readingAnswers.id, answer.id));
        }

        await finalizeUsageReservation(reservationId);
        await db
          .update(readingAttempts)
          .set({ status: "graded", updatedAt: new Date() })
          .where(eq(readingAttempts.id, attempt.id));
      } catch (error) {
        await refundUsageReservation(reservationId);
        await db
          .update(readingAttempts)
          .set({ status: "grading_failed", updatedAt: new Date() })
          .where(eq(readingAttempts.id, attempt.id));
        if (error instanceof ReadingError) throw error;
        throw new ReadingError("GRADING_FAILED");
      }
    } catch (error) {
      await db
        .update(readingAttempts)
        .set({ status: "grading_failed", updatedAt: new Date() })
        .where(eq(readingAttempts.id, attempt.id));
      if (
        !(error instanceof ReadingError) ||
        (error.code !== "GRADING_FAILED" &&
          error.code !== "AI_QUOTA_EXCEEDED" &&
          error.code !== "OPENAI_NOT_CONFIGURED" &&
          error.code !== "AI_DISABLED" &&
          error.code !== "GENERATION_UNAVAILABLE")
      ) {
        throw error;
      }
    }
  }

  const freshAttempt = await db.query.readingAttempts.findFirst({
    where: eq(readingAttempts.id, attempt.id),
  });
  const freshAnswers = await db.query.readingAnswers.findMany({
    where: eq(readingAnswers.attemptId, attempt.id),
  });

  revalidateReading(passage.id, set.id);

  return toPracticePayload({
    passage,
    set,
    questions,
    attempt: freshAttempt!,
    answers: freshAnswers,
    revealed: true,
  });
}

export async function retryReadingWrittenGrading(
  attemptId: string,
): Promise<ReadingPracticePayload> {
  const userId = await getCurrentUserId();
  const attempt = await db.query.readingAttempts.findFirst({
    where: and(
      eq(readingAttempts.id, attemptId),
      eq(readingAttempts.userId, userId),
    ),
  });
  if (!attempt) throw new ReadingError("ATTEMPT_NOT_FOUND");
  if (attempt.status !== "grading_failed") {
    throw new ReadingError("ATTEMPT_NOT_EDITABLE");
  }

  await db
    .update(readingAttempts)
    .set({ status: "in_progress", submittedAt: null, updatedAt: new Date() })
    .where(eq(readingAttempts.id, attempt.id));

  return submitReadingAttempt(attempt.id);
}

export async function startNewReadingAttempt(
  setId: string,
): Promise<ReadingPracticePayload> {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const set = await db.query.readingQuestionSets.findFirst({
    where: and(
      eq(readingQuestionSets.id, setId),
      eq(readingQuestionSets.userId, userId),
      eq(readingQuestionSets.workspaceId, workspace.id),
    ),
  });
  if (!set || set.status !== "ready") throw new ReadingError("SET_NOT_READY");

  await db
    .update(readingAttempts)
    .set({ status: "submitted", updatedAt: new Date() })
    .where(
      and(
        eq(readingAttempts.setId, setId),
        eq(readingAttempts.userId, userId),
        eq(readingAttempts.status, "in_progress"),
      ),
    );

  await db.insert(readingAttempts).values({
    setId,
    userId,
    status: "in_progress",
  });

  return startOrResumeReadingAttempt(setId);
}

export async function deleteReadingQuestionSet(setId: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const set = await db.query.readingQuestionSets.findFirst({
    where: and(
      eq(readingQuestionSets.id, setId),
      eq(readingQuestionSets.userId, userId),
      eq(readingQuestionSets.workspaceId, workspace.id),
    ),
  });
  if (!set) throw new ReadingError("SET_NOT_FOUND");
  await db.delete(readingQuestionSets).where(eq(readingQuestionSets.id, setId));
  revalidateReading(set.passageId, setId);
  return { ok: true as const, passageId: set.passageId };
}
