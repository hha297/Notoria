"use client";

import { LocaleSelector } from "@/components/layout/locale-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type LocaleThemeControlsProps = {
  locale: AppLocale;
  /** Compact auth presentation: matching ~36px controls beside the logo. */
  compact?: boolean;
};

/** Shared language + theme controls used by the dashboard header and auth pages. */
export function LocaleThemeControls({
  locale,
  compact = false,
}: LocaleThemeControlsProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center",
        compact ? "gap-2" : "gap-1.5 sm:gap-2",
      )}
    >
      <LocaleSelector value={locale} compact={compact} />
      <ThemeToggle compact={compact} />
    </div>
  );
}
