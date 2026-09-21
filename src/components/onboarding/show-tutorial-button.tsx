"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SectionTutorial } from "@/components/onboarding/section-tutorial";
import { Button } from "@/components/ui/button";
import { isSectionTutorialCompleted } from "@/lib/onboarding/storage";
import type { TutorialSectionId } from "@/lib/onboarding/tutorials";
import { cn } from "@/lib/utils";

type ShowTutorialButtonProps = {
  section: TutorialSectionId;
  variant?: "ghost" | "outline";
  className?: string;
  /** Open once on mount when this section tutorial is not marked complete. */
  autoOpenIfIncomplete?: boolean;
};

export function ShowTutorialButton({
  section,
  variant = "outline",
  className,
  autoOpenIfIncomplete = false,
}: ShowTutorialButtonProps) {
  const t = useTranslations("tutorials");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoOpenIfIncomplete) return;
    if (isSectionTutorialCompleted(section)) return;
    const timeout = window.setTimeout(() => setOpen(true), 480);
    return () => window.clearTimeout(timeout);
  }, [autoOpenIfIncomplete, section]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        data-tutorial-section={section}
        className={cn("route-tutorial-btn", className)}
        onClick={() => setOpen(true)}
      >
        <CircleHelp className="size-4" />
        <span className="hidden sm:inline">{t("show")}</span>
        <span className="sm:hidden">{t("showShort")}</span>
      </Button>
      <SectionTutorial section={section} open={open} onOpenChange={setOpen} />
    </>
  );
}
