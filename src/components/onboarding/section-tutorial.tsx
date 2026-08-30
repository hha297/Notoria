"use client";

import { GuidedSectionTutorial } from "@/components/onboarding/guided-section-tutorial";
import type { TutorialSectionId } from "@/lib/onboarding/tutorials";

type SectionTutorialProps = {
  section: TutorialSectionId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SectionTutorial(props: SectionTutorialProps) {
  return <GuidedSectionTutorial {...props} />;
}
