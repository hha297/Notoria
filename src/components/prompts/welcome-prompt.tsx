"use client";

import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPromptLanguageName } from "@/lib/prompts/language-name";
import { resolveWelcomePrompt } from "@/lib/prompts/resolve";
import {
  markWelcomeModalHidden,
  markWelcomeModalShown,
  shouldShowWelcomeModal,
} from "@/lib/prompts/storage";
import { getTimeOfDay } from "@/lib/prompts/time-of-day";
import type { PromptDefinition } from "@/lib/prompts/types";

const SHOW_DELAY_MS = 450;

type WelcomePromptModalProps = {
  hasWorkspace: boolean;
  languageCode: string | null;
};

export function WelcomePromptModal({
  hasWorkspace,
  languageCode,
}: WelcomePromptModalProps) {
  const t = useTranslations("prompts");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<PromptDefinition | null>(null);
  const openedRef = useRef(false);

  const tryOpen = useCallback(() => {
    if (openedRef.current) return;
    if (!shouldShowWelcomeModal()) return;

    const next = resolveWelcomePrompt({
      hasWorkspace,
      languageCode,
      timeOfDay: getTimeOfDay(),
    });
    if (!next) return;

    openedRef.current = true;
    setPrompt(next);
    setOpen(true);
    markWelcomeModalShown();
  }, [hasWorkspace, languageCode]);

  useEffect(() => {
    const timeout = window.setTimeout(tryOpen, SHOW_DELAY_MS);

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        markWelcomeModalHidden();
        return;
      }
      tryOpen();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tryOpen]);

  function close() {
    openedRef.current = false;
    setOpen(false);
  }

  const language = languageCode
    ? getPromptLanguageName(languageCode, locale)
    : "";
  const titleKey = prompt?.title ?? `titles.${prompt?.type ?? "greeting"}`;
  const title = prompt ? t(titleKey) : "";
  const message = prompt
    ? prompt.usesLanguage
      ? t.rich(prompt.message, {
          lang: () => (
            <span className="font-semibold text-ink">{language}</span>
          ),
        })
      : t(prompt.message)
    : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        className="gap-5 sm:max-w-md sm:p-6"
      >
        <DialogHeader className="gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent-lime text-ink">
            <Sparkles className="size-5" aria-hidden />
          </div>
          <DialogTitle className="font-heading text-xl leading-snug sm:text-2xl">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed sm:text-base">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="-mx-4 -mb-4 flex-row justify-end gap-2 sm:-mx-6 sm:-mb-6">
          <Button type="button" variant="outline" onClick={close}>
            {t("skip")}
          </Button>
          <Button type="button" onClick={close}>
            {t("gotIt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
