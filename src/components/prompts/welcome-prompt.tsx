"use client";

import {
  BookOpen,
  Dumbbell,
  Languages,
  MessageCircle,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import promptStyles from "@/components/style/prompts/prompt.module.css";
import { mx } from "@/lib/css-module";
import { getPromptLanguageName } from "@/lib/prompts/language-name";
import { resolveWelcomePrompt } from "@/lib/prompts/resolve";
import {
  markWelcomeModalHidden,
  markWelcomeModalShown,
  shouldShowWelcomeModal,
} from "@/lib/prompts/storage";
import { getTimeOfDay } from "@/lib/prompts/time-of-day";
import type {
  PromptCategory,
  PromptDefinition,
  PromptType,
} from "@/lib/prompts/types";

const SHOW_DELAY_MS = 450;

const TYPE_ICONS: Record<PromptType, LucideIcon> = {
  greeting: Sparkles,
  motivation: MessageCircle,
  language: Languages,
  activity: Dumbbell,
};

const CATEGORY_ACCENT: Record<PromptCategory, string> = {
  greeting: "home",
  motivation: "home",
  language: "vocab",
  vocabulary: "vocab",
  writing: "writing",
  theory: "theory",
  exercise: "exercise",
};

const CATEGORY_ICONS: Partial<Record<PromptCategory, LucideIcon>> = {
  vocabulary: Languages,
  writing: PenLine,
  theory: BookOpen,
  exercise: Dumbbell,
};

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

  const type = prompt?.type ?? "greeting";
  const category = prompt?.category;
  const accent = (category && CATEGORY_ACCENT[category]) || "home";
  const Icon = (category && CATEGORY_ICONS[category]) || TYPE_ICONS[type];
  const kicker = t(`titles.${type}`);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        data-prompt-accent={accent === "home" ? undefined : accent}
        className={mx(promptStyles, "sheet sm:max-w-md")}
      >
        <div className={mx(promptStyles, "body")}>
          <div className={mx(promptStyles, "mark")} aria-hidden>
            <Icon className="size-3.5" />
            <p className={mx(promptStyles, "kicker")}>{kicker}</p>
          </div>
          <DialogTitle className={mx(promptStyles, "title")}>{title}</DialogTitle>
          <DialogDescription className={mx(promptStyles, "lede")}>
            {message}
          </DialogDescription>
        </div>
        <div className={mx(promptStyles, "footer")}>
          <Button
            type="button"
            variant="outline"
            className={mx(promptStyles, "cancel")}
            onClick={close}
          >
            {t("skip")}
          </Button>
          <Button
            type="button"
            className={mx(promptStyles, "cta")}
            onClick={close}
          >
            {t("gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
