"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TOC_IDS = [
  "welcome",
  "how-it-works",
  "vocabulary",
  "theory",
  "exercise",
  "writing",
  "listening",
  "speaking",
  "connections",
  "philosophy",
  "start-here",
] as const;

type TocId = (typeof TOC_IDS)[number];

const FLOW_STAGES = [
  "collect",
  "understand",
  "practice",
  "create",
  "listen",
  "speak",
  "review",
] as const;

const CONNECTION_STAGES = [
  "vocabTheory",
  "exercise",
  "writingListening",
  "speaking",
  "review",
  "addMore",
] as const;

const FIRST_STEPS = [
  "language",
  "words",
  "theory",
  "exercise",
  "writing",
  "listeningSpeaking",
  "return",
] as const;

export function GettingStartedGuide() {
  const t = useTranslations("gettingStarted");

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] xl:gap-12">
      <GuideToc />

      <div className="mt-10 space-y-16 lg:mt-0 lg:max-w-3xl xl:max-w-4xl">
        <header className="space-y-3">
          <p className="text-[15px] font-medium uppercase tracking-[0.2px] text-muted-foreground">
            {t("meta.eyebrow")}
          </p>
          <h1 className="heading-xl text-ink">{t("meta.title")}</h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("meta.description")}
          </p>
        </header>

        <GuideSection id="welcome" title={t("welcome.title")}>
          <p className="text-base leading-relaxed text-ink">{t("welcome.lead")}</p>
          <GuideParagraphs items={t.raw("welcome.paragraphs") as string[]} />
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("welcome.examplesIntro")}
          </p>
          <GuideBulletList items={t.raw("welcome.examples") as string[]} />
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("welcome.overTime")}
          </p>
          <GuideCallout variant="dark">
            <p className="font-heading text-lg font-medium text-on-primary">
              {t("welcome.noWrongWay.title")}
            </p>
            <GuideParagraphs
              className="mt-3 text-on-dark-muted"
              items={t.raw("welcome.noWrongWay.paragraphs") as string[]}
            />
          </GuideCallout>
        </GuideSection>

        <GuideSection id="how-it-works" title={t("howItWorks.title")}>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("howItWorks.intro")}
          </p>
          <FlowDiagram
            stages={FLOW_STAGES.map((stage) => t(`howItWorks.flow.${stage}`))}
          />
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("howItWorks.anywhereNote")}
          </p>
          <div className="space-y-6">
            {(["collect", "understand", "practice", "use", "review"] as const).map(
              (step) => (
                <div
                  key={step}
                  className="rounded-xl border border-hairline-cloud bg-card p-5 sm:p-6"
                >
                  <h3 className="font-heading text-base font-medium text-ink">
                    {t(`howItWorks.steps.${step}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t(`howItWorks.steps.${step}.body`)}
                  </p>
                </div>
              ),
            )}
          </div>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("howItWorks.connectedNote")}
          </p>
        </GuideSection>

        <ModuleSection id="vocabulary" module="vocabulary" />
        <ModuleSection id="theory" module="theory" />
        <ModuleSection id="exercise" module="exercise" />
        <ModuleSection id="writing" module="writing" />
        <ModuleSection id="listening" module="listening" />
        <ModuleSection id="speaking" module="speaking" />

        <GuideSection id="connections" title={t("connections.title")}>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("connections.intro")}
          </p>
          <ConnectionDiagram
            stages={CONNECTION_STAGES.map((stage) =>
              t(`connections.flow.${stage}`),
            )}
          />
          <GuideParagraphs items={t.raw("connections.paragraphs") as string[]} />
          <GuideCallout variant="lime">{t("connections.highlight")}</GuideCallout>
        </GuideSection>

        <GuideSection id="philosophy" title={t("philosophy.title")}>
          <p className="text-base leading-relaxed text-ink">{t("philosophy.lead")}</p>
          <GuideBulletList items={t.raw("philosophy.dontNeed") as string[]} />
          <GuideParagraphs items={t.raw("philosophy.canDo") as string[]} />
          <GuideCallout variant="dark">
            <p className="font-heading text-lg font-medium text-accent-lime">
              {t("philosophy.quote")}
            </p>
          </GuideCallout>
        </GuideSection>

        <GuideSection id="start-here" title={t("startHere.title")}>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("startHere.intro")}
          </p>
          <div className="rounded-xl border border-hairline-cloud bg-card p-5 sm:p-6">
            <h3 className="font-heading text-base font-medium text-ink">
              {t("startHere.firstTen.title")}
            </h3>
            <ol className="mt-4 space-y-3">
              {FIRST_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed sm:text-base">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-lime text-xs font-semibold text-ink">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">
                    {t(`startHere.firstTen.steps.${step}`)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <GuideCallout variant="lime">{t("startHere.closing")}</GuideCallout>
        </GuideSection>
      </div>
    </div>
  );
}

function GuideToc() {
  const t = useTranslations("gettingStarted");

  return (
    <nav
      aria-label={t("toc.title")}
      className="lg:sticky lg:top-8 lg:self-start"
    >
      <p className="hidden text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground lg:block">
        {t("toc.title")}
      </p>
      <ul className="flex flex-wrap gap-2 lg:mt-3 lg:flex-col lg:gap-1">
        {TOC_IDS.map((id) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="inline-block rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-ink lg:block lg:px-2 lg:py-1.5"
            >
              {t(`toc.${tocKey(id)}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ModuleSection({
  id,
  module,
}: {
  id: TocId;
  module:
    | "vocabulary"
    | "theory"
    | "exercise"
    | "writing"
    | "listening"
    | "speaking";
}) {
  const t = useTranslations("gettingStarted");
  const bullets = t.raw(`sections.${module}.bullets`) as string[];
  const examples = t.has(`sections.${module}.examples`)
    ? (t.raw(`sections.${module}.examples`) as string[])
    : undefined;
  const emphasis = t.has(`sections.${module}.emphasis`)
    ? t(`sections.${module}.emphasis`)
    : null;

  return (
    <GuideSection id={id} title={t(`sections.${module}.title`)}>
      <p className="text-base leading-relaxed text-muted-foreground">
        {t(`sections.${module}.intro`)}
      </p>
      {bullets ? <GuideBulletList items={bullets} /> : null}
      {t.has(`sections.${module}.body`) ? (
        <p className="text-base leading-relaxed text-muted-foreground">
          {t(`sections.${module}.body`)}
        </p>
      ) : null}
      {t.has(`sections.${module}.exampleIntro`) ? (
        <p className="text-base leading-relaxed text-ink">
          {t(`sections.${module}.exampleIntro`)}
        </p>
      ) : null}
      {examples ? (
        <div className="rounded-lg border border-hairline-cloud bg-muted/30 p-4 sm:p-5">
          <GuideBulletList
            items={examples}
            className="font-mono text-sm text-ink"
          />
        </div>
      ) : null}
      {t.has(`sections.${module}.exampleNote`) ? (
        <p className="text-base leading-relaxed text-muted-foreground">
          {t(`sections.${module}.exampleNote`)}
        </p>
      ) : null}
      {emphasis ? <GuideCallout variant="lime">{emphasis}</GuideCallout> : null}
    </GuideSection>
  );
}

function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <h2 className="heading-md border-b border-hairline-cloud pb-3 text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function GuideParagraphs({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((paragraph) => (
        <p key={paragraph} className="text-base leading-relaxed text-muted-foreground">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function GuideBulletList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2 pl-1", className)}>
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-2 text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-lime" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function GuideCallout({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "dark" | "lime";
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-5 sm:p-6",
        variant === "dark"
          ? "card-surface-dark"
          : "border border-hairline-cloud bg-accent-lime/10",
      )}
    >
      <div className="text-sm leading-relaxed sm:text-base">{children}</div>
    </div>
  );
}

function FlowDiagram({ stages }: { stages: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 rounded-xl border border-hairline-violet bg-ink-deep px-4 py-6">
      {stages.map((stage, index) => (
        <span key={stage} className="inline-flex items-center gap-2">
          <span className="rounded-md bg-accent-lime/20 px-2.5 py-1 text-xs font-medium text-accent-lime sm:text-sm">
            {stage}
          </span>
          {index < stages.length - 1 ? (
            <ArrowRight className="size-3.5 text-on-dark-muted" aria-hidden />
          ) : null}
        </span>
      ))}
    </div>
  );
}

function ConnectionDiagram({ stages }: { stages: string[] }) {
  return (
    <div className="space-y-2 rounded-xl border border-hairline-cloud bg-card p-5 sm:p-6">
      {stages.map((stage, index) => (
        <div key={stage} className="flex flex-col items-center gap-2">
          <p className="w-full rounded-lg bg-muted/50 px-4 py-2.5 text-center text-sm font-medium text-ink sm:text-base">
            {stage}
          </p>
          {index < stages.length - 1 ? (
            <span className="text-muted-foreground" aria-hidden>
              ↓
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function tocKey(id: TocId): string {
  if (id === "how-it-works") return "howItWorks";
  if (id === "start-here") return "startHere";
  return id;
}
