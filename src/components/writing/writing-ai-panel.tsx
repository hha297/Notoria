"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { WritingAiSuggestion } from "@/lib/writing/ai-types";
import { cn } from "@/lib/utils";

type WritingAiPanelProps = {
  suggestions: WritingAiSuggestion[];
  onApply: (suggestion: WritingAiSuggestion) => void;
  onSkip: (id: string) => void;
};

export function WritingAiPanel({
  suggestions,
  onApply,
  onSkip,
}: WritingAiPanelProps) {
  const t = useTranslations("writing.ai");

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      {suggestions.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-accent-lime/40 bg-accent-lime/5 p-3"
        >
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
            <Sparkles className="size-3.5 text-accent-lime" />
            {t("suggestion")}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-ink">
              {t(`types.${item.type}`)}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                item.severity === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t(`severities.${item.severity}`)}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink">
            <span className="text-muted-foreground">{item.original}</span>
            {" → "}
            <span className="font-medium">{item.replacement}</span>
          </p>
          {item.explanation ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {item.explanation}
            </p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => onApply(item)}>
              {t("apply")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSkip(item.id ?? item.original)}
            >
              {t("skip")}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("disclaimer")}</p>
        </div>
      ))}
    </div>
  );
}
