"use client";

import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionTutorial } from "@/components/onboarding/section-tutorial";
import { Button } from "@/components/ui/button";
import type { TutorialSectionId } from "@/lib/onboarding/tutorials";

type ShowTutorialButtonProps = {
  section: TutorialSectionId;
};

export function ShowTutorialButton({ section }: ShowTutorialButtonProps) {
  const t = useTranslations("tutorials");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
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
