"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Languages, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { CountryFlag } from "@/components/layout/country-flag";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  filterLanguagesByQuery,
  getLanguageByCode,
  getLanguageName,
  groupLanguagesByRegion,
  WORKPLACE_LANGUAGES,
  type LanguageRegion,
  type WorkplaceLanguage,
} from "@/lib/languages";
import { cn } from "@/lib/utils";

type WorkplaceLanguagePickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Available options after occupied-language filtering. Defaults to full catalogue. */
  languages?: readonly WorkplaceLanguage[];
  disabled?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
};

function LanguageOptionRow({
  name,
  flagCode,
}: {
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

export function WorkplaceLanguagePicker({
  value,
  onValueChange,
  languages = WORKPLACE_LANGUAGES,
  disabled,
  id,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: WorkplaceLanguagePickerProps) {
  const t = useTranslations("workspace");
  const searchId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = getLanguageByCode(value);
  const displayName = selected?.name ?? getLanguageName(value);
  const flagCode = selected?.flagCode;

  const filtered = useMemo(
    () => filterLanguagesByQuery(languages, query),
    [languages, query],
  );
  const groups = useMemo(() => groupLanguagesByRegion(filtered), [filtered]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setQuery("");
  }, [open]);

  function regionLabel(region: LanguageRegion) {
    return t(`languageRegions.${region}`);
  }

  return (
    <Select
      value={value}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)} aria-label={ariaLabel}>
        <SelectValue>
          <LanguageOptionRow name={displayName} flagCode={flagCode} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className={cn(
          "max-h-[min(24rem,var(--available-height))] p-0",
          contentClassName,
        )}
      >
        <div
          className="sticky top-0 z-20 border-b border-page-accent-border bg-popover p-2"
          role="presentation"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id={searchId}
              type="search"
              value={query}
              placeholder={t("languageSearchPlaceholder")}
              aria-label={t("languageSearchPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              className="h-9 rounded-md pl-8 text-sm"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // Keep typing in the search field; do not drive Select typeahead.
                event.stopPropagation();
              }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        </div>

        {groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("languageSearchEmpty")}
          </p>
        ) : (
          <div className="p-1">
            {groups.map((group) => (
              <SelectGroup key={group.region}>
                <SelectLabel>{regionLabel(group.region)}</SelectLabel>
                {group.languages.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    <LanguageOptionRow name={item.name} flagCode={item.flagCode} />
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
