"use client";

import { WorkplaceLanguagePicker } from "@/components/shared/workplace-language-picker";
import { WORKPLACE_LANGUAGES, type WorkplaceLanguage } from "@/lib/languages";

type LanguageSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  languages?: readonly WorkplaceLanguage[];
  disabled?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
};

/** Shared workspace/study language selector with search and regional groups. */
export function LanguageSelect({
  value,
  onValueChange,
  languages = WORKPLACE_LANGUAGES,
  disabled,
  id,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: LanguageSelectProps) {
  return (
    <WorkplaceLanguagePicker
      value={value}
      onValueChange={onValueChange}
      languages={languages}
      disabled={disabled}
      id={id}
      className={className}
      contentClassName={contentClassName}
      aria-label={ariaLabel}
    />
  );
}
