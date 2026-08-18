"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Dumbbell,
  Headphones,
  Languages,
  PenLine,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FEATURE_REQUIREMENTS } from "@/lib/onboarding/requirements";
import { markSectionTutorialCompleted } from "@/lib/onboarding/storage";
import {
  getSectionTutorial,
  type TutorialSectionId,
} from "@/lib/onboarding/tutorials";
import { cn } from "@/lib/utils";

const EASE = [0.25, 0.1, 0.25, 1] as const;

const SECTION_ICONS = {
  vocabulary: Languages,
  theory: BookOpen,
  exercise: Dumbbell,
  writing: PenLine,
  listening: Headphones,
  speaking: Video,
} as const;

type SectionTutorialProps = {
  section: TutorialSectionId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SectionTutorial({
  section,
  open,
  onOpenChange,
}: SectionTutorialProps) {
  const t = useTranslations("tutorials");
  const tutorial = getSectionTutorial(section);
  const [stepIndex, setStepIndex] = useState(0);
  const Icon = SECTION_ICONS[section];
  const step = tutorial.steps[stepIndex];
  const isLast = stepIndex >= tutorial.steps.length - 1;

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open, section]);

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

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close(true)}>
      <DialogContent showCloseButton={false} className="gap-5 sm:max-w-md sm:p-6">
        <DialogHeader className="gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent-lime text-ink">
            <Icon className="size-5" aria-hidden />
          </div>
          <DialogTitle className="font-heading text-xl leading-snug sm:text-2xl">
            {t(`${section}.title`)}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed sm:text-base">
            {t(`${section}.description`)}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="rounded-lg border border-hairline-cloud bg-muted/40 p-3 sm:p-4"
          >
            <p className="text-sm font-medium text-ink">
              {t(`${section}.steps.${step.id}.title`)}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {section === "exercise" && step.id === "vocabulary"
                ? t(`${section}.steps.${step.id}.body`, {
                    count: FEATURE_REQUIREMENTS.exercises.recommendedVocabulary,
                  })
                : t(`${section}.steps.${step.id}.body`)}
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

        <DialogFooter className="-mx-4 -mb-4 flex-row flex-wrap justify-end gap-2 sm:-mx-6 sm:-mb-6">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
