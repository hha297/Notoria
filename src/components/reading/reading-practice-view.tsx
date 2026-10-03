"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookPlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { PageShell } from "@/components/layout/page-shell";
import { SessionPageLoading } from "@/components/layout/page-loading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  retryReadingWrittenGrading,
  saveReadingAnswers,
  startNewReadingAttempt,
  startOrResumeReadingAttempt,
  submitReadingAttempt,
} from "@/lib/actions/reading";
import { isReadingErrorCode } from "@/lib/reading/errors";
import type { ReadingAttemptClient } from "@/lib/reading/types";
import styles from "@/components/style/reading/practice.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type ReadingPracticeViewProps = {
  passageId: string;
  setId: string;
  passageTitle: string;
  passageBody: string;
};

function responseText(value: unknown) {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "value" in value &&
    (value as { value: unknown }).value != null
  ) {
    return String((value as { value: unknown }).value);
  }
  if (value == null) return "";
  return String(value);
}

export function ReadingPracticeView({
  passageId,
  setId,
  passageTitle,
  passageBody,
}: ReadingPracticeViewProps) {
  const t = useTranslations("reading");
  const tBilling = useTranslations("billing");
  const { openUpgrade } = useProAccess();
  const router = useRouter();
  const [attempt, setAttempt] = useState<ReadingAttemptClient | null>(null);
  const [index, setIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState<"passage" | "questions">(
    "questions",
  );
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [selectionMenu, setSelectionMenu] = useState<{
    word: string;
    sentence: string;
    x: number;
    y: number;
  } | null>(null);

  function notifyActionError(error: unknown, fallbackKey: string) {
    const code = error instanceof Error ? error.message : "generic";
    if (code === "AI_QUOTA_EXCEEDED") {
      toast.error(tBilling("quotaExceeded"));
      openUpgrade();
      return;
    }
    toast.error(
      isReadingErrorCode(code) ? t(`errors.${code}`) : t(fallbackKey),
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await startOrResumeReadingAttempt(setId);
        if (cancelled) return;
        setAttempt(data.attempt);
        const initial: Record<string, unknown> = {};
        for (const answer of data.attempt.answers) {
          initial[answer.questionId] = answer.response;
        }
        setResponses(initial);
      } catch (error) {
        const code = error instanceof Error ? error.message : "generic";
        toast.error(
          isReadingErrorCode(code) ? t(`errors.${code}`) : t("errors.PROCESSING_FAILED"),
        );
        router.push(`/reading/${passageId}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setId, passageId, router, t]);

  const questions = attempt?.questions ?? [];
  const current = questions[index];
  const revealed = Boolean(attempt?.revealAnswers);

  const answerByQuestion = useMemo(() => {
    return new Map(
      (attempt?.answers ?? []).map((item) => [item.questionId, item]),
    );
  }, [attempt]);

  function setResponse(questionId: string, value: unknown) {
    if (!attempt || revealed || attempt.status !== "in_progress") return;
    setResponses((prev) => {
      const next = { ...prev, [questionId]: value };
      void saveReadingAnswers({
        attemptId: attempt.id,
        answers: [{ questionId, response: value }],
      }).catch(() => undefined);
      return next;
    });
  }

  function handleSubmit() {
    if (!attempt) return;
    const unanswered = questions.some((q) => {
      const value = responses[q.id];
      return responseText(value).trim().length === 0;
    });
    if (unanswered && !window.confirm(t("practice.unansweredWarn"))) return;

    startTransition(async () => {
      try {
        const result = await submitReadingAttempt({
          attemptId: attempt.id,
          answers: Object.entries(responses).map(([questionId, response]) => ({
            questionId,
            response,
          })),
        });
        setAttempt(result.attempt);
        if (result.attempt.status === "grading_failed") {
          toast.message(t("practice.gradingPending"));
        } else {
          toast.success(t("submitted"));
        }
      } catch (error) {
        notifyActionError(error, "errors.GRADING_FAILED");
      }
    });
  }

  function handleRetry() {
    startTransition(async () => {
      try {
        const data = await startNewReadingAttempt(setId);
        setAttempt(data.attempt);
        setResponses({});
        setIndex(0);
      } catch (error) {
        notifyActionError(error, "errors.PROCESSING_FAILED");
      }
    });
  }

  function handleRetryGrading() {
    if (!attempt) return;
    startTransition(async () => {
      try {
        const data = await retryReadingWrittenGrading(attempt.id);
        setAttempt(data.attempt);
        if (data.attempt.status === "grading_failed") {
          toast.message(t("practice.gradingPending"));
        } else {
          toast.success(t("submitted"));
        }
      } catch (error) {
        notifyActionError(error, "errors.GRADING_FAILED");
      }
    });
  }

  function handlePassageMouseUp(event: React.MouseEvent<HTMLElement>) {
    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (!text || text.length > 80) {
      setSelectionMenu(null);
      return;
    }
    const word = text.split(/\s+/).slice(0, 4).join(" ");
    const sentence =
      passageBody
        .split(/(?<=[.!?。！？])\s+/)
        .find((part) => part.includes(text))
        ?.trim() ?? text;

    setSelectionMenu({
      word,
      sentence: sentence.slice(0, 280),
      x: event.clientX,
      y: event.clientY,
    });
  }

  function openVocabulary() {
    if (!selectionMenu) return;
    const params = new URLSearchParams({
      prefill: selectionMenu.word,
      note: selectionMenu.sentence,
    });
    setSelectionMenu(null);
    router.push(`/vocabulary/new?${params.toString()}`);
  }

  if (loading || !attempt || !current) {
    return <SessionPageLoading />;
  }

  const saved = answerByQuestion.get(current.id);
  const tfnsOptions = ["true", "false", "not_stated"] as const;

  return (
    <PageShell className="writing-atelier-shell reading-atelier-shell">
      <div className={cn("writing-atelier reading-atelier", mx(styles, "shell"))}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/reading/${passageId}`}
            className="writing-back"
          >
            <ArrowLeft className="size-4 shrink-0" />
            {passageTitle}
          </Link>
          <p className="text-sm text-muted-foreground">
            {t("practice.progress", {
              current: index + 1,
              total: questions.length,
            })}
          </p>
        </div>

        <div
          className={mx(styles, "mobileTabs")}
          role="tablist"
          aria-label={t("practice.mobileTabsAria")}
        >
          <button
            type="button"
            className={mx(styles, "mobileTab")}
            data-active={mobileTab === "passage"}
            onClick={() => setMobileTab("passage")}
          >
            {t("passagePanel")}
          </button>
          <button
            type="button"
            className={mx(styles, "mobileTab")}
            data-active={mobileTab === "questions"}
            onClick={() => setMobileTab("questions")}
          >
            {t("questionsPanel")}
          </button>
        </div>

        <div className={mx(styles, "split")}>
          <article
            className={cn(
              mx(styles, "panel"),
              mx(styles, "mobileOnlyPassage"),
            )}
            data-hidden={mobileTab !== "passage"}
            onMouseUp={handlePassageMouseUp}
          >
            <p className={mx(styles, "panelTitle")}>{t("passagePanel")}</p>
            <p className={mx(styles, "passageBody")}>{passageBody}</p>
            <p className={mx(styles, "vocabHint")}>{t("vocabHint")}</p>
          </article>

          <section
            className={cn(
              mx(styles, "panel"),
              mx(styles, "mobileOnlyQuestions"),
            )}
            data-hidden={mobileTab !== "questions"}
          >
            <p className={mx(styles, "panelTitle")}>
              {t("practice.questionLabel", { number: index + 1 })}
            </p>
            <h2 className="mt-2 text-lg font-semibold">{current.prompt}</h2>

            <div className="mt-4 space-y-2">
              {current.type === "written" ? (
                <Textarea
                  value={responseText(responses[current.id])}
                  onChange={(e) => setResponse(current.id, e.target.value)}
                  disabled={revealed || isPending}
                  rows={5}
                  placeholder={t("practice.writtenPlaceholder")}
                />
              ) : (
                (current.options ?? [...tfnsOptions]).map((option) => {
                  const selected =
                    responseText(responses[current.id]).toLowerCase() ===
                    option.toLowerCase();
                  const label =
                    current.type === "true_false_not_stated"
                      ? t(`tfns.${option as "true" | "false" | "not_stated"}`)
                      : option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={revealed || isPending}
                      onClick={() => setResponse(current.id, option)}
                      className={mx(styles, "optionButton")}
                      data-selected={selected}
                    >
                      {label}
                    </button>
                  );
                })
              )}
            </div>

            {revealed ? (
              <div className="mt-5 space-y-3 border-t border-hairline-cloud pt-4 text-sm">
                {saved?.isCorrect != null ? (
                  <p className="font-semibold">
                    {saved.isCorrect
                      ? t("practice.correct")
                      : t("practice.incorrect")}
                  </p>
                ) : null}
                {current.correctAnswer != null && current.type !== "written" ? (
                  <p>
                    <span className="font-semibold">
                      {t("practice.expected")}:{" "}
                    </span>
                    {current.type === "true_false_not_stated"
                      ? t(
                          `tfns.${responseText(current.correctAnswer) as "true" | "false" | "not_stated"}`,
                        )
                      : responseText(current.correctAnswer)}
                  </p>
                ) : null}
                {current.explanation ? (
                  <p>{current.explanation}</p>
                ) : null}
                {current.excerpt ? (
                  <p>
                    <em>{current.excerpt}</em>
                  </p>
                ) : null}
                {saved?.feedback ? (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="font-semibold">
                      {t("practice.aiFeedbackLabel")}
                    </p>
                    {saved.feedback.summary ? (
                      <p className="mt-1">{saved.feedback.summary}</p>
                    ) : null}
                    {saved.feedback.strengths?.length ? (
                      <p className="mt-2 text-muted-foreground">
                        {t("practice.understood")}:{" "}
                        {saved.feedback.strengths.join(", ")}
                      </p>
                    ) : null}
                    {saved.feedback.improvements?.length ? (
                      <p className="mt-1 text-muted-foreground">
                        {t("practice.missing")}:{" "}
                        {saved.feedback.improvements.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={index === 0}
                onClick={() => setIndex((v) => Math.max(0, v - 1))}
              >
                ←
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={index >= questions.length - 1}
                onClick={() =>
                  setIndex((v) => Math.min(questions.length - 1, v + 1))
                }
              >
                →
              </Button>
              {!revealed ? (
                <Button
                  type="button"
                  className="route-primary-cta ml-auto"
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {t("practice.submit")}
                </Button>
              ) : attempt.status === "grading_failed" ? (
                <Button
                  type="button"
                  className="route-primary-cta ml-auto"
                  onClick={handleRetryGrading}
                  disabled={isPending}
                >
                  {t("practice.retryGrading")}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="route-primary-cta ml-auto"
                  onClick={handleRetry}
                  disabled={isPending}
                >
                  {t("practice.retryAttempt")}
                </Button>
              )}
            </div>

            {revealed && attempt.objectiveTotal != null ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("practice.objectiveScore", {
                  correct: attempt.objectiveCorrect ?? 0,
                  total: attempt.objectiveTotal,
                })}
              </p>
            ) : null}
          </section>
        </div>
      </div>

      {selectionMenu ? (
        <div
          className="fixed z-50 rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ left: selectionMenu.x, top: selectionMenu.y + 8 }}
        >
          <Button size="sm" variant="ghost" onClick={openVocabulary}>
            <BookPlus className="size-4" />
            {t("addToVocabulary")}
          </Button>
        </div>
      ) : null}
    </PageShell>
  );
}
