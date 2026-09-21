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

const MODULE_TINT: Record<
  "vocabulary" | "theory" | "exercise" | "writing" | "listening" | "speaking",
  string
> = {
  vocabulary: "vocab",
  theory: "theory",
  exercise: "exercise",
  writing: "writing",
  listening: "listen",
  speaking: "speak",
};

export function GettingStartedGuide() {
  const t = useTranslations("gettingStarted");

  return (
    <div className="guide-layout">
      <GuideToc />

      <div className="guide-main">
        <header className="writing-hero guide-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("meta.eyebrow")}</p>
            <h1 className="writing-brand-title">{t("meta.title")}</h1>
            <p className="writing-brand-lede">{t("meta.description")}</p>
          </div>
        </header>

        <GuideSection id="welcome" title={t("welcome.title")}>
          <p className="guide-lead">{t("welcome.lead")}</p>
          <GuideParagraphs items={t.raw("welcome.paragraphs") as string[]} />
          <p className="guide-body">{t("welcome.examplesIntro")}</p>
          <GuideBulletList items={t.raw("welcome.examples") as string[]} />
          <p className="guide-body">{t("welcome.overTime")}</p>
          <GuideCallout variant="dark">
            <p className="guide-callout-title text-on-inverse">
              {t("welcome.noWrongWay.title")}
            </p>
            <GuideParagraphs
              className="mt-3"
              tone="inverse"
              items={t.raw("welcome.noWrongWay.paragraphs") as string[]}
            />
          </GuideCallout>
        </GuideSection>

        <GuideSection id="how-it-works" title={t("howItWorks.title")}>
          <p className="guide-body">{t("howItWorks.intro")}</p>
          <FlowDiagram
            stages={FLOW_STAGES.map((stage) => t(`howItWorks.flow.${stage}`))}
          />
          <p className="guide-body">{t("howItWorks.anywhereNote")}</p>
          <div className="guide-step-stack">
            {(
              ["collect", "understand", "practice", "use", "review"] as const
            ).map((step, index) => (
              <article key={step} className="guide-step-card">
                <span className="guide-step-index" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="guide-step-title">
                  {t(`howItWorks.steps.${step}.title`)}
                </h3>
                <p className="guide-step-body">
                  {t(`howItWorks.steps.${step}.body`)}
                </p>
              </article>
            ))}
          </div>
          <p className="guide-body">{t("howItWorks.connectedNote")}</p>
        </GuideSection>

        <ModuleSection id="vocabulary" module="vocabulary" />
        <ModuleSection id="theory" module="theory" />
        <ModuleSection id="exercise" module="exercise" />
        <ModuleSection id="writing" module="writing" />
        <ModuleSection id="listening" module="listening" />
        <ModuleSection id="speaking" module="speaking" />

        <GuideSection id="connections" title={t("connections.title")}>
          <p className="guide-body">{t("connections.intro")}</p>
          <ConnectionDiagram
            stages={CONNECTION_STAGES.map((stage) =>
              t(`connections.flow.${stage}`),
            )}
          />
          <GuideParagraphs items={t.raw("connections.paragraphs") as string[]} />
          <GuideCallout variant="lime">{t("connections.highlight")}</GuideCallout>
        </GuideSection>

        <GuideSection id="philosophy" title={t("philosophy.title")}>
          <p className="guide-lead">{t("philosophy.lead")}</p>
          <GuideBulletList items={t.raw("philosophy.dontNeed") as string[]} />
          <GuideParagraphs items={t.raw("philosophy.canDo") as string[]} />
          <GuideCallout variant="dark">
            <p className="guide-callout-title text-primary">
              {t("philosophy.quote")}
            </p>
          </GuideCallout>
        </GuideSection>

        <GuideSection id="start-here" title={t("startHere.title")}>
          <p className="guide-body">{t("startHere.intro")}</p>
          <div className="guide-start-panel">
            <h3 className="guide-step-title">{t("startHere.firstTen.title")}</h3>
            <ol className="guide-start-list">
              {FIRST_STEPS.map((step, index) => (
                <li key={step} className="guide-start-item">
                  <span className="guide-start-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{t(`startHere.firstTen.steps.${step}`)}</span>
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
    <nav aria-label={t("toc.title")} className="guide-toc">
      <p className="guide-toc-title">{t("toc.title")}</p>
      <ul className="guide-toc-list">
        {TOC_IDS.map((id) => (
          <li key={id}>
            <a href={`#${id}`} className="guide-toc-link">
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
    <GuideSection
      id={id}
      title={t(`sections.${module}.title`)}
      moduleTint={MODULE_TINT[module]}
    >
      <p className="guide-body">{t(`sections.${module}.intro`)}</p>
      {bullets ? <GuideBulletList items={bullets} /> : null}
      {t.has(`sections.${module}.body`) ? (
        <p className="guide-body">{t(`sections.${module}.body`)}</p>
      ) : null}
      {t.has(`sections.${module}.exampleIntro`) ? (
        <p className="guide-lead">{t(`sections.${module}.exampleIntro`)}</p>
      ) : null}
      {examples ? (
        <div className="guide-example-block">
          <GuideBulletList
            items={examples}
            className="font-mono text-sm text-ink"
          />
        </div>
      ) : null}
      {t.has(`sections.${module}.exampleNote`) ? (
        <p className="guide-body">{t(`sections.${module}.exampleNote`)}</p>
      ) : null}
      {emphasis ? <GuideCallout variant="lime">{emphasis}</GuideCallout> : null}
    </GuideSection>
  );
}

function GuideSection({
  id,
  title,
  children,
  moduleTint,
}: {
  id: string;
  title: string;
  children: ReactNode;
  moduleTint?: string;
}) {
  return (
    <section
      id={id}
      className="guide-section"
      data-guide-module={moduleTint}
    >
      <h2 className="guide-section-title">{title}</h2>
      <div className="guide-section-body">{children}</div>
    </section>
  );
}

function GuideParagraphs({
  items,
  className,
  tone = "default",
}: {
  items: string[];
  className?: string;
  tone?: "default" | "inverse";
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((paragraph) => (
        <p
          key={paragraph}
          className={cn(
            "text-base leading-relaxed",
            tone === "inverse"
              ? "text-on-inverse-muted"
              : "text-muted-foreground",
          )}
        >
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
    <ul className={cn("guide-bullets", className)}>
      {items.map((item) => (
        <li key={item} className="guide-bullet">
          <span className="guide-bullet-dot" aria-hidden="true" />
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
        "guide-callout",
        variant === "dark" ? "is-dark" : "is-soft",
      )}
    >
      <div className="text-sm leading-relaxed sm:text-base">{children}</div>
    </div>
  );
}

function FlowDiagram({ stages }: { stages: string[] }) {
  return (
    <div className="guide-flow">
      {stages.map((stage, index) => (
        <span key={stage} className="guide-flow-item">
          <span className="guide-flow-chip">{stage}</span>
          {index < stages.length - 1 ? (
            <ArrowRight
              className="size-3.5 shrink-0 text-on-inverse-muted"
              aria-hidden
            />
          ) : null}
        </span>
      ))}
    </div>
  );
}

function ConnectionDiagram({ stages }: { stages: string[] }) {
  return (
    <div className="guide-connection">
      {stages.map((stage, index) => (
        <div key={stage} className="guide-connection-row">
          <p className="guide-connection-stage">{stage}</p>
          {index < stages.length - 1 ? (
            <span className="guide-connection-arrow" aria-hidden>
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
