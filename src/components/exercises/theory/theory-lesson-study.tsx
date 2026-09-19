"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { JSONContent } from "@tiptap/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ChevronRight, Loader2 } from "lucide-react";
import { DescriptionContent } from "@/components/form/description-content";
import { TheoryLessonProse } from "@/components/exercises/theory/theory-lesson-prose";
import { Button } from "@/components/ui/button";
import { isKnownTheoryCategory, theoryDocPlainText } from "@/lib/theory/content";
import {
  groupTheoryLessonBeats,
  selectTheoryQuickReview,
  splitExampleLayers,
  theoryHasQuickReview,
  type TheoryLessonBeat,
  type TheoryLessonBeatKind,
  type TheoryLessonSection,
} from "@/lib/theory-exercises/lesson-content";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export type TheoryLessonView = "overview" | "quick";

type TheoryLessonStudyProps = {
  title: string;
  category?: string;
  description?: string;
  beats: TheoryLessonBeat[];
  theoryHref: string;
  view: TheoryLessonView;
  practiceReady: boolean;
  generating: boolean;
  generateError?: string | null;
  practiceLocked?: boolean;
  onQuickReview: () => void;
  onSkipToPractice: () => void;
  onStartPractice: () => void;
  onRetryGenerate?: () => void;
};

export function TheoryLessonStudy({
  title,
  category,
  description,
  beats,
  theoryHref,
  view,
  practiceReady,
  generating,
  generateError,
  practiceLocked = false,
  onQuickReview,
  onSkipToPractice,
  onStartPractice,
  onRetryGenerate,
}: TheoryLessonStudyProps) {
  const t = useTranslations("exercises.theory");
  const tTheory = useTranslations("theory");
  const reduceMotion = useReducedMotion();
  const sections = useMemo(() => groupTheoryLessonBeats(beats), [beats]);
  const quickSections = useMemo(
    () => selectTheoryQuickReview(sections),
    [sections],
  );
  const showQuick = theoryHasQuickReview(sections) || quickSections.length > 0;
  const categoryLabel = category
    ? isKnownTheoryCategory(category)
      ? tTheory(`categories.${category}`)
      : category
    : null;

  const startPractice = () => {
    if (practiceReady) {
      onStartPractice();
      return;
    }
    onRetryGenerate?.();
  };

  const practiceLabel = practiceReady
    ? t("lesson.startPractice")
    : generating
      ? t("lesson.preparing")
      : practiceLocked
        ? t("unlockAi")
        : t("generateAi");

  return (
    <article
      className="relative mx-auto w-full min-w-0 max-w-3xl"
      data-theory-category={category || undefined}
    >
      <LessonOpening
        title={title}
        categoryLabel={categoryLabel}
        description={description}
        compact={view === "quick"}
      >
        {view === "overview" ? (
          <OverviewActions
            theoryHref={theoryHref}
            showQuick={showQuick}
            sections={quickSections}
            practiceReady={practiceReady}
            generating={generating}
            practiceLocked={practiceLocked}
            generateError={generateError}
            onQuickReview={onQuickReview}
            onSkip={onSkipToPractice}
            onRetryGenerate={onRetryGenerate}
          />
        ) : null}
      </LessonOpening>

      {view === "quick" ? (
        <ReviewDocument
          sections={quickSections}
          theoryHref={theoryHref}
          reduceMotion={Boolean(reduceMotion)}
          practiceLabel={generateError ? t("generateAi") : practiceLabel}
          generating={generating}
          practiceReady={practiceReady}
          generateError={generateError}
          onStartPractice={startPractice}
        />
      ) : null}
    </article>
  );
}

function LessonDecor({
  tone,
}: {
  tone: "hero" | "idea" | "examples" | "insight" | "practice";
}) {
  const palette = {
    hero: {
      a: "bg-(--lesson-row-fg) top-[-20%] left-[-8%] size-44 opacity-35",
      b: "bg-(--lesson-explain) top-[30%] right-[-12%] size-36",
      c: "text-(--lesson-insight) top-8 right-8",
    },
    idea: {
      a: "bg-(--lesson-concept) -top-8 -left-6 size-32",
      b: "bg-(--lesson-explain) bottom-[-20%] right-[-8%] size-28",
      c: "text-(--lesson-concept) top-5 right-6",
    },
    examples: {
      a: "bg-(--lesson-example) -top-10 right-[-6%] size-36",
      b: "bg-(--lesson-explain) bottom-[-18%] left-[-10%] size-24",
      c: "text-(--lesson-example) top-6 left-6",
    },
    insight: {
      a: "bg-(--lesson-insight) -top-8 left-[12%] size-32",
      b: "bg-(--lesson-practice) bottom-[-16%] right-[-8%] size-28",
      c: "text-(--lesson-insight) top-5 right-7",
    },
    practice: {
      a: "bg-(--lesson-practice) -top-10 -left-8 size-40",
      b: "bg-(--lesson-insight) bottom-[-20%] right-[-6%] size-32",
      c: "text-(--lesson-practice) top-6 right-6",
    },
  }[tone];

  return (
    <div aria-hidden className="theory-decor">
      <span className={cn("theory-blob", palette.a)} />
      <span className={cn("theory-blob", palette.b)} />
      <span className={cn("theory-diamond", palette.c)} />
    </div>
  );
}

function LessonOpening({
  title,
  categoryLabel,
  description,
  compact,
  children,
}: {
  title: string;
  categoryLabel: string | null;
  description?: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations("exercises.theory");

  return (
    <header
      className={cn(
        "theory-zone-hero relative -mx-4 px-5 py-8 sm:-mx-6 sm:px-7",
        compact ? "sm:py-8" : "sm:py-11",
      )}
    >
      <LessonDecor tone="hero" />
      <div className="relative">
        <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-(--lesson-row-fg) uppercase">
          {t("lesson.label")}
          {categoryLabel ? (
            <>
              <span className="mx-2 text-(--lesson-explain)/50" aria-hidden>
                ·
              </span>
              <span className="tracking-[0.16em] text-(--lesson-explain)">
                {categoryLabel}
              </span>
            </>
          ) : null}
        </p>
        <div className={cn("mt-5 space-y-3", !compact && "sm:mt-6 sm:space-y-4")}>
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {t("lesson.learnThis")}
          </p>
          <h1
            className={cn(
              "font-heading font-semibold tracking-tight text-pretty wrap-anywhere text-ink",
              compact
                ? "text-[1.7rem] leading-[1.15] sm:text-[2.1rem]"
                : "text-[2.1rem] leading-[1.1] sm:text-[2.65rem] md:text-[3rem]",
            )}
          >
            {title}
          </h1>
          {description?.trim() ? (
            <DescriptionContent
              value={description}
              className={cn(
                "max-w-xl leading-[1.75] text-ink/80",
                compact ? "text-[1.02rem]" : "text-[1.06rem] sm:text-[1.14rem]",
              )}
            />
          ) : null}
        </div>
        {children}
      </div>
    </header>
  );
}

function OverviewActions({
  theoryHref,
  showQuick,
  sections,
  practiceReady,
  generating,
  practiceLocked,
  generateError,
  onQuickReview,
  onSkip,
  onRetryGenerate,
}: {
  theoryHref: string;
  showQuick: boolean;
  sections: TheoryLessonSection[];
  practiceReady: boolean;
  generating: boolean;
  practiceLocked: boolean;
  generateError?: string | null;
  onQuickReview: () => void;
  onSkip: () => void;
  onRetryGenerate?: () => void;
}) {
  const t = useTranslations("exercises.theory");

  return (
    <div className="mt-8 space-y-7 sm:mt-10">
      {sections.length > 0 ? (
        <ol className="space-y-2.5">
          <li className="mb-1 text-[0.68rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {t("lesson.outline")}
          </li>
          {sections.map((section, index) => (
            <li
              key={section.id}
              className="flex min-w-0 items-baseline gap-3 text-[0.98rem] leading-snug"
            >
              <span
                className={cn(
                  "font-mono text-[1.05rem] font-semibold tabular-nums",
                  section.kind === "examples"
                    ? "text-(--lesson-example)"
                    : section.kind === "detail"
                      ? "text-(--lesson-insight)"
                      : "text-(--lesson-concept)",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 wrap-anywhere text-ink/90">
                {section.title?.trim() ||
                  fallbackLabelForKind(section.kind, (key) => t(key))}
              </span>
            </li>
          ))}
          <li className="flex min-w-0 items-baseline gap-3 pt-0.5 text-[0.98rem]">
            <span className="font-mono text-[1.05rem] font-semibold tabular-nums text-(--lesson-practice)">
              {String(sections.length + 1).padStart(2, "0")}
            </span>
            <span className="text-ink/90">{t("lesson.nowPractice")}</span>
          </li>
        </ol>
      ) : null}

      {generateError ? (
        <p className="text-sm text-destructive" role="alert">
          {generateError}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {showQuick ? (
          <Button
            type="button"
            onClick={onQuickReview}
            className="h-11 w-full border-transparent bg-(--lesson-row-fg) text-background hover:opacity-90 sm:h-10 sm:w-auto"
          >
            {t("lesson.quickReview")}
            <ChevronRight className="size-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant={showQuick ? "ghost" : "default"}
          onClick={practiceReady ? onSkip : onRetryGenerate}
          disabled={!practiceReady && generating}
          className={cn(
            "h-11 w-full sm:h-10 sm:w-auto",
            !showQuick &&
              "border-transparent bg-(--lesson-practice) text-background hover:opacity-90",
          )}
        >
          {!practiceReady && generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {practiceReady
            ? t("lesson.skipReview")
            : practiceLocked
              ? t("unlockAi")
              : generating
                ? t("lesson.preparing")
                : t("generateAi")}
          {practiceReady ? <ChevronRight className="size-4" /> : null}
        </Button>
      </div>
      <p>
        <Link
          href={theoryHref}
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none"
        >
          {t("lesson.openTheory")}
        </Link>
      </p>
    </div>
  );
}

function ReviewDocument({
  sections,
  theoryHref,
  reduceMotion,
  practiceLabel,
  practiceReady,
  generating,
  generateError,
  onStartPractice,
}: {
  sections: TheoryLessonSection[];
  theoryHref: string;
  reduceMotion: boolean;
  practiceLabel: string;
  practiceReady: boolean;
  generating: boolean;
  generateError?: string | null;
  onStartPractice: () => void;
}) {
  const t = useTranslations("exercises.theory");

  const scrollToSection = (id: string) => {
    document.getElementById(`theory-lesson-${id}`)?.scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "start",
    });
  };

  return (
    <div className="relative mt-8 sm:mt-10">
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        <button
          type="button"
          onClick={onStartPractice}
          className="text-sm font-medium text-(--lesson-practice) underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-(--lesson-practice)/40 focus-visible:outline-none"
        >
          {t("lesson.skipReview")}
        </button>
        <Link
          href={theoryHref}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-(--lesson-concept)/40 focus-visible:outline-none"
        >
          {t("lesson.openTheory")}
        </Link>
      </div>

      {sections.length > 1 ? (
        <nav
          aria-label={t("lesson.outline")}
          className="sticky top-0 z-10 -mx-4 mb-6 bg-surface-elevated px-5 py-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-24 before:h-24 before:bg-surface-elevated sm:-mx-6 sm:px-7"
        >
          <p className="mb-2 text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {t("lesson.outline")}
          </p>
          <ol className="flex flex-wrap gap-x-4 gap-y-1.5">
            {sections.map((section, index) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="inline-flex max-w-full items-baseline gap-2 text-left text-sm text-muted-foreground transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-(--lesson-concept)/40 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "font-mono text-[0.8rem] font-semibold tabular-nums",
                      section.kind === "examples"
                        ? "text-(--lesson-example)"
                        : section.kind === "detail"
                          ? "text-(--lesson-insight)"
                          : "text-(--lesson-concept)",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 wrap-anywhere">
                    {section.title?.trim() ||
                      fallbackLabelForKind(section.kind, (key) => t(key))}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="space-y-5 sm:space-y-6">
        {sections.map((section, index) => (
          <LessonSection
            key={section.id}
            section={section}
            index={index}
            fallbackLabel={fallbackLabelForKind(section.kind, (key) => t(key))}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      <div className="theory-zone-practice relative mt-6 -mx-4 px-5 py-8 sm:-mx-6 sm:mt-8 sm:px-7 sm:py-10">
        <LessonDecor tone="practice" />
        <div className="relative">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--lesson-practice) uppercase">
            {t("lesson.nowPractice")}
          </p>
          <p className="mt-3 max-w-xl font-heading text-[1.55rem] leading-snug font-semibold tracking-tight text-pretty text-ink sm:text-[1.85rem]">
            {t("lesson.applyNow")}
          </p>
          {generateError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {generateError}
            </p>
          ) : null}
          <Button
            type="button"
            onClick={onStartPractice}
            disabled={!practiceReady && generating}
            className="mt-6 h-11 w-full border-transparent bg-(--lesson-practice) text-background hover:opacity-90 sm:h-10 sm:w-auto"
          >
            {!practiceReady && generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {practiceLabel}
            {!(!practiceReady && generating) ? (
              <ChevronRight className="size-4" />
            ) : null}
          </Button>
        </div>
      </div>
    </div>
  );
}

function fallbackLabelForKind(
  kind: TheoryLessonBeatKind,
  t: (key: "lesson.theIdea" | "lesson.seeIt" | "lesson.notice") => string,
) {
  if (kind === "examples") return t("lesson.seeIt");
  if (kind === "detail") return t("lesson.notice");
  return t("lesson.theIdea");
}

function isInsightSection(section: TheoryLessonSection): boolean {
  if (section.kind !== "detail") return false;
  const text = section.docs.map(theoryDocPlainText).join(" ").trim();
  return text.length > 0 && text.length <= 180 && section.examples.length === 0;
}

function LessonSection({
  section,
  index,
  fallbackLabel,
  reduceMotion,
}: {
  section: TheoryLessonSection;
  index: number;
  fallbackLabel: string;
  reduceMotion: boolean;
}) {
  const t = useTranslations("exercises.theory");
  const number = String(index + 1).padStart(2, "0");
  const heading = section.title?.trim() || fallbackLabel;
  const insight = isInsightSection(section);
  const zone =
    insight
      ? "insight"
      : section.kind === "examples"
        ? "examples"
        : section.kind === "detail"
          ? "detail"
          : "idea";

  return (
    <motion.section
      id={`theory-lesson-${section.id}`}
      aria-labelledby={`theory-lesson-heading-${section.id}`}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.24,
        delay: reduceMotion ? 0 : index * 0.05,
        ease: EASE,
      }}
      className={cn(
        "relative min-w-0 scroll-mt-24 -mx-4 px-5 py-7 sm:-mx-6 sm:px-7 sm:py-8",
        zone === "idea" && "theory-zone-idea",
        zone === "examples" && "theory-zone-examples",
        zone === "insight" && "theory-zone-insight",
        zone === "detail" && "theory-zone-detail px-5 py-6 sm:px-7",
      )}
    >
      {zone !== "detail" ? <LessonDecor tone={zone} /> : null}

      <div className="relative">
        {insight ? (
          <>
            <p className="inline-flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.2em] text-(--lesson-insight) uppercase">
              <span
                aria-hidden
                className="inline-block size-2 shrink-0 rotate-45 border-[1.5px] border-(--lesson-insight) bg-(--lesson-insight)/25"
              />
              {t("lesson.keyIdea")}
            </p>
            <h2
              id={`theory-lesson-heading-${section.id}`}
              className={cn(
                "font-heading font-semibold tracking-tight text-pretty wrap-anywhere text-ink",
                section.title?.trim() ? "mt-2 text-xl sm:text-2xl" : "sr-only",
              )}
            >
              {heading}
            </h2>
            <div className={cn("space-y-4", section.title?.trim() ? "mt-4" : "mt-3")}>
              {section.docs.map((doc, docIndex) => (
                <TheoryLessonProse
                  key={`${section.id}-doc-${docIndex}`}
                  doc={doc}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <p
                className={cn(
                  "font-mono text-[1.35rem] font-semibold tabular-nums leading-none sm:text-[1.6rem]",
                  section.kind === "examples"
                    ? "text-(--lesson-example)"
                    : section.kind === "detail"
                      ? "text-(--lesson-explain)"
                      : "text-(--lesson-concept)",
                )}
              >
                {number}
              </p>
              <p
                className={cn(
                  "text-[0.68rem] font-semibold tracking-[0.18em] uppercase",
                  section.kind === "examples"
                    ? "text-(--lesson-example)"
                    : section.kind === "detail"
                      ? "text-(--lesson-explain)"
                      : "text-(--lesson-concept)",
                )}
              >
                {section.kind === "examples"
                  ? t("lesson.seeIt")
                  : section.kind === "detail"
                    ? t("lesson.notice")
                    : t("lesson.theIdea")}
              </p>
            </div>
            <h2
              id={`theory-lesson-heading-${section.id}`}
              className={cn(
                "font-heading font-semibold tracking-tight text-pretty wrap-anywhere text-ink",
                section.title?.trim()
                  ? section.kind === "idea"
                    ? "mt-3 text-[1.45rem] leading-snug sm:text-[1.75rem]"
                    : "mt-3 text-xl sm:text-2xl"
                  : "sr-only",
              )}
            >
              {heading}
            </h2>
          </>
        )}

        {!insight && section.kind === "examples" ? (
          <div className="mt-6">
            <LessonExamples examples={section.examples} />
          </div>
        ) : null}

        {!insight && section.kind !== "examples" ? (
          <>
            <div className="mt-5 space-y-5">
              {section.docs.map((doc, docIndex) => (
                <TheoryLessonProse
                  key={`${section.id}-doc-${docIndex}`}
                  doc={doc}
                />
              ))}
            </div>
            {section.examples.length > 0 ? (
              <div className="mt-6">
                <LessonExamples examples={section.examples} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </motion.section>
  );
}

function LessonExamples({ examples }: { examples: JSONContent[] }) {
  const compare = examples.length >= 2;

  return (
    <div
      className={cn(
        "grid gap-6",
        compare && "lg:grid-cols-2 lg:gap-x-8 lg:gap-y-8",
      )}
    >
      {examples.map((example, index) => (
        <LessonExample
          key={`example-${index}`}
          doc={example}
          index={index}
          showIndex={compare}
          compareSlot={compare ? (index % 2 === 0 ? "a" : "b") : "a"}
        />
      ))}
    </div>
  );
}

function LessonExample({
  doc,
  index,
  showIndex,
  compareSlot,
}: {
  doc: JSONContent;
  index: number;
  showIndex: boolean;
  compareSlot: "a" | "b";
}) {
  const t = useTranslations("exercises.theory");
  const reduceMotion = useReducedMotion();
  const { primary, note } = splitExampleLayers(doc);
  const [open, setOpen] = useState(false);

  return (
    <figure
      className={cn(
        "relative min-w-0 pl-4 sm:pl-5",
        compareSlot === "b" ? "theory-example-b" : "theory-example-a",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/70 via-(--exercise-accent)/22 to-transparent"
      />
      <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-(--exercise-accent) uppercase">
        {t("lesson.example")}
        {showIndex ? (
          <span className="ml-2 font-mono tracking-normal opacity-70">
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
      </p>
      <blockquote className="mt-3">
        <TheoryLessonProse doc={primary} variant="example" />
      </blockquote>
      {note ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-sm font-medium text-(--exercise-accent) underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-(--exercise-accent)/40 focus-visible:outline-none"
            aria-expanded={open}
          >
            {open ? t("lesson.hideNote") : t("lesson.revealNote")}
          </button>
          <AnimatePresence>
            {open ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE }}
                className="mt-2"
              >
                <TheoryLessonProse doc={note} variant="note" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </figure>
  );
}
