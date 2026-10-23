"use client";

import { LocaleSelector } from "@/components/layout/locale-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type LocaleThemeControlsProps = {
  locale: AppLocale;
  /** Compact auth presentation: matching ~36px controls beside the logo. */
  compact?: boolean;
  className?: string;
};

/** Shared language + theme controls used by the dashboard header and auth pages. */
export function LocaleThemeControls({
  locale,
  compact = false,
  className,
}: LocaleThemeControlsProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        compact ? "gap-1.5 sm:gap-2" : "gap-2",
        className,
      )}
      /* Keep control order in LTR chrome even when UI copy is RTL. */
      dir="ltr"
    >
      <LocaleSelector value={locale} compact={compact} />
      <ThemeToggle compact={compact} />
    </div>
  );
}
