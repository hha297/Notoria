"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Dumbbell,
  Headphones,
  Languages,
  PenLine,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { useTutorialTarget } from "@/hooks/use-tutorial-target";
import { markSectionTutorialCompleted } from "@/lib/onboarding/storage";
import { dispatchTutorialPrepare } from "@/lib/onboarding/tutorial-prepare";
import {
  getTutorialPopoverPosition,
  type TutorialPlacement,
} from "@/lib/onboarding/tutorial-position";
import {
  getSectionTutorial,
  type TutorialSectionId,
} from "@/lib/onboarding/tutorials";
import { cn } from "@/lib/utils";
import {
  TutorialArrow,
  TutorialBackdrop,
  TutorialSpotlight,
} from "@/components/onboarding/tutorial-spotlight";

const EASE = [0.25, 0.1, 0.25, 1] as const;

const SECTION_ICONS: Record<TutorialSectionId, LucideIcon> = {
  vocabulary: Languages,
  vocabularyAdd: Languages,
  theory: BookOpen,
  exercise: Dumbbell,
  writing: PenLine,
  listening: Headphones,
  speaking: Video,
};

type GuidedSectionTutorialProps = {
  section: TutorialSectionId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GuidedSectionTutorial({
  section,
  open,
  onOpenChange,
}: GuidedSectionTutorialProps) {
  const t = useTranslations("tutorials");
  const tutorial = getSectionTutorial(section);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [prepareTick, setPrepareTick] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverSize, setPopoverSize] = useState({ width: 360, height: 280 });
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    placement: TutorialPlacement;
  }>({ top: 0, left: 0, placement: "center" });

  const Icon = SECTION_ICONS[section];
  const step = tutorial.steps[stepIndex];
  const isLast = stepIndex >= tutorial.steps.length - 1;
  const targetId = step?.target;
  const { rect, missing } = useTutorialTarget(targetId, open, prepareTick);
  const guided = Boolean(targetId && rect && !missing);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    } else {
      dispatchTutorialPrepare("close-listening-upload");
      dispatchTutorialPrepare("close-folder-create");
    }
  }, [open, section]);

  useEffect(() => {
    if (!open) return;

    if (step?.prepare === "open-listening-upload") {
      dispatchTutorialPrepare("open-listening-upload");
      dispatchTutorialPrepare("close-folder-create");
    } else if (step?.prepare === "open-folder-create") {
      dispatchTutorialPrepare("open-folder-create");
      dispatchTutorialPrepare("close-listening-upload");
    } else {
      dispatchTutorialPrepare("close-listening-upload");
      dispatchTutorialPrepare("close-folder-create");
    }

    if (step?.prepare) {
      const timeout = window.setTimeout(() => {
        setPrepareTick((current) => current + 1);
      }, 320);
      return () => window.clearTimeout(timeout);
    }
  }, [open, stepIndex, step?.prepare]);

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) return;
    const next = popoverRef.current.getBoundingClientRect();
    setPopoverSize({ width: next.width, height: next.height });
  }, [open, stepIndex, guided, rect]);

  useLayoutEffect(() => {
    if (!open) return;
    setPosition(getTutorialPopoverPosition(guided ? rect : null, popoverSize));
  }, [open, guided, rect, popoverSize, stepIndex]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function close(completed: boolean) {
    if (completed) {
      markSectionTutorialCompleted(section);
    }
    onOpenChange(false);
  }

  function handleNext() {
    if (isLast) {
      close(true);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  if (!mounted || !open || !step) return null;

  const stepBody = t(`${section}.steps.${step.id}.body`);

  const content = (
    <>
      <div className="fixed inset-0 z-[189] pointer-events-auto" aria-hidden />
      <AnimatePresence mode="wait">
        {guided && rect ? (
          <TutorialSpotlight
            rect={rect}
            stepKey={`${section}-${step.id}`}
            section={section}
          />
        ) : (
          <TutorialBackdrop key="backdrop" />
        )}
      </AnimatePresence>

      <motion.div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tutorial-${section}-title`}
        aria-describedby={`tutorial-${section}-step`}
        data-tutorial-section={section}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{
          opacity: 1,
          scale: 1,
          top: position.top,
          left: position.left,
        }}
        transition={{ duration: 0.22, ease: EASE }}
        className={cn(
          "tutorial-sheet fixed z-[191] w-[min(100vw-2rem,24rem)]",
          guided ? "" : "max-w-md",
        )}
        style={{ top: position.top, left: position.left }}
      >
        <TutorialArrow placement={position.placement} />

        <header className="tutorial-sheet-header">
          <span className="tutorial-sheet-icon" aria-hidden>
            <Icon className="size-4" />
          </span>
          <div className="tutorial-sheet-heading">
            <p className="tutorial-sheet-kicker">{t("guideLabel")}</p>
            <p
              id={`tutorial-${section}-title`}
              className="tutorial-sheet-title"
            >
              {t(`${section}.title`)}
            </p>
            <p className="tutorial-sheet-progress">
              {t("stepProgress", {
                current: stepIndex + 1,
                total: tutorial.steps.length,
              })}
            </p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            id={`tutorial-${section}-step`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="tutorial-sheet-step"
          >
            <p className="tutorial-sheet-step-title">
              {t(`${section}.steps.${step.id}.title`)}
            </p>
            <p className="tutorial-sheet-step-body">{stepBody}</p>
          </motion.div>
        </AnimatePresence>

        <div className="tutorial-sheet-dots" aria-hidden>
          {tutorial.steps.map((item, index) => (
            <span
              key={item.id}
              className={cn(
                "tutorial-sheet-dot",
                index === stepIndex && "is-active",
              )}
            />
          ))}
        </div>

        <footer className="tutorial-sheet-footer">
          <Button
            type="button"
            variant="outline"
            className="tutorial-sheet-skip"
            onClick={() => close(true)}
          >
            {t("skip")}
          </Button>
          {isLast && tutorial.ctaHref ? (
            <LinkButton
              href={tutorial.ctaHref}
              className="tutorial-sheet-cta"
              onClick={() => close(true)}
            >
              {t(`${section}.cta`)}
            </LinkButton>
          ) : (
            <Button
              type="button"
              className="tutorial-sheet-cta"
              onClick={handleNext}
            >
              {isLast ? t("done") : t("next")}
            </Button>
          )}
        </footer>
      </motion.div>
    </>
  );

  return createPortal(content, document.body);
}
