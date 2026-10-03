"use client";

import { Languages } from "lucide-react";
import { CountryFlag } from "@/components/layout/country-flag";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLanguageByCode,
  getLanguageName,
  WORKPLACE_LANGUAGES,
} from "@/lib/languages";
import { cn } from "@/lib/utils";

type LanguageSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
};

function LanguageOption({
  code,
  name,
  flagCode,
}: {
  code: string;
  name: string;
  flagCode?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {flagCode ? (
        <CountryFlag code={flagCode} className="h-3.5 w-5 shrink-0" />
      ) : (
        <Languages className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

export function LanguageSelect({
  value,
  onValueChange,
  disabled,
  id,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: LanguageSelectProps) {
  const selected = getLanguageByCode(value);
  const displayName = selected?.name ?? getLanguageName(value);
  const flagCode = selected?.flagCode;

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)} aria-label={ariaLabel}>
        <SelectValue>
          <LanguageOption code={value} name={displayName} flagCode={flagCode} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={cn("max-h-72", contentClassName)}>
        {WORKPLACE_LANGUAGES.map((item) => (
          <SelectItem key={item.code} value={item.code}>
            <LanguageOption
              code={item.code}
              name={item.name}
              flagCode={item.flagCode}
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
