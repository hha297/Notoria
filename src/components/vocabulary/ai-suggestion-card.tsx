"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type VocabularyAiSuggestionCardProps = {
  title?: string;
  body: string;
  suggestionLabel?: string;
  acceptLabel?: string;
  onAccept?: () => void;
  onSkip: () => void;
};

export function VocabularyAiChecking({ id }: { id?: string }) {
  const t = useTranslations("vocabulary");
  return (
    <p
      id={id}
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
      role="status"
    >
      <Loader2 className="size-3 animate-spin" />
      {t("aiChecking")}
    </p>
  );
}

export function VocabularyAiSuggestionCard({
  title,
  body,
  suggestionLabel,
  acceptLabel,
  onAccept,
  onSkip,
}: VocabularyAiSuggestionCardProps) {
  const t = useTranslations("vocabulary");

  return (
    <div className="rounded-lg border border-accent-lime/40 bg-accent-lime/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
        <Sparkles className="size-3.5 text-accent-lime" />
        {title ?? t("aiSuggestion")}
      </p>
      <p className="mt-1.5 text-sm leading-snug text-ink">{body}</p>
      {suggestionLabel ? (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            {t("aiPossibleMeaning")}
          </p>
          <p className="text-sm font-medium text-ink">{suggestionLabel}</p>
        </div>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {onAccept && acceptLabel ? (
          <Button type="button" size="sm" onClick={onAccept}>
            {acceptLabel}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={onSkip}>
          {t("aiSkip")}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("aiDisclaimer")}</p>
    </div>
  );
}
