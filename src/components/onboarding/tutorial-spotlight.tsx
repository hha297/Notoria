"use client";

import { motion } from "motion/react";
import type { TutorialPlacement } from "@/lib/onboarding/tutorial-position";
import type { TutorialSectionId } from "@/lib/onboarding/tutorials";
import styles from "@/components/style/onboarding/tutorial.module.css";
import { mx } from "@/lib/css-module";

const EASE = [0.25, 0.1, 0.25, 1] as const;
const TARGET_PADDING = 6;

type TutorialSpotlightProps = {
  rect: DOMRect;
  stepKey: string;
  section?: TutorialSectionId;
};

export function TutorialSpotlight({
  rect,
  stepKey,
  section,
}: TutorialSpotlightProps) {
  const top = rect.top - TARGET_PADDING;
  const left = rect.left - TARGET_PADDING;
  const width = rect.width + TARGET_PADDING * 2;
  const height = rect.height + TARGET_PADDING * 2;

  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, top, left, width, height }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      data-tutorial-section={section}
      className={mx(
        styles,
        "tutorial-spotlight-cutout pointer-events-none fixed z-[190]",
      )}
      aria-hidden
    />
  );
}

type TutorialBackdropProps = {
  onClick?: () => void;
};

export function TutorialBackdrop({ onClick }: TutorialBackdropProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: EASE }}
      className={mx(styles, "tutorial-backdrop fixed inset-0 z-[189]")}
      onClick={onClick}
      aria-hidden
    />
  );
}

type TutorialArrowProps = {
  placement: TutorialPlacement;
};

export function TutorialArrow({ placement }: TutorialArrowProps) {
  if (placement === "center") return null;

  return (
    <span
      aria-hidden
      className={mx(
        styles,
        "tutorial-sheet-arrow absolute size-3 rotate-45",
        placement === "bottom" &&
          "-top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0",
        placement === "top" &&
          "-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0",
        placement === "right" && "-left-1.5 top-8 border-b-0 border-l-0",
        placement === "left" && "-right-1.5 top-8 border-t-0 border-r-0",
      )}
    />
  );
}
