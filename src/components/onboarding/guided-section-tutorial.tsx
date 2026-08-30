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
          <TutorialSpotlight rect={rect} stepKey={`${section}-${step.id}`} />
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
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{
          opacity: 1,
          scale: 1,
          top: position.top,
          left: position.left,
        }}
        transition={{ duration: 0.22, ease: EASE }}
        className={cn(
          "fixed z-[191] w-[min(100vw-2rem,24rem)] rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 sm:p-5",
          guided ? "" : "max-w-md",
        )}
        style={{ top: position.top, left: position.left }}
      >
        <TutorialArrow placement={position.placement} />

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-lime text-ink">
              <Icon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p
                id={`tutorial-${section}-title`}
                className="font-heading text-lg leading-snug text-ink"
              >
                {t(`${section}.title`)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("stepProgress", {
                  current: stepIndex + 1,
                  total: tutorial.steps.length,
                })}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              id={`tutorial-${section}-step`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="rounded-lg border border-hairline-cloud bg-muted/40 p-3 sm:p-4"
            >
              <p className="text-sm font-medium text-ink">
                {t(`${section}.steps.${step.id}.title`)}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {stepBody}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-1.5" aria-hidden>
            {tutorial.steps.map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  index === stepIndex ? "bg-ink" : "bg-ink/20",
                )}
              />
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-hairline-cloud pt-4">
            <Button type="button" variant="outline" onClick={() => close(true)}>
              {t("skip")}
            </Button>
            {isLast && tutorial.ctaHref ? (
              <LinkButton href={tutorial.ctaHref} onClick={() => close(true)}>
                {t(`${section}.cta`)}
              </LinkButton>
            ) : (
              <Button type="button" onClick={handleNext}>
                {isLast ? t("done") : t("next")}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );

  return createPortal(content, document.body);
}
