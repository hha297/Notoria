"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown, Languages, Search, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { CountryFlag } from "@/components/layout/country-flag";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  function handleSelect(code: string) {
    onValueChange(code);
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        id={id}
        variant="outline"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "control-surface h-10 w-full justify-between gap-1.5 overflow-visible px-2.5 font-normal [&_svg]:size-auto",
          className,
        )}
      >
        <LanguageOptionRow name={displayName} flagCode={flagCode} />
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0 sm:p-0",
            "max-h-[min(88dvh,calc(100%-2rem))] w-full max-w-[calc(100%-2rem)]",
            "rounded-2xl border border-hairline-cloud bg-popover bg-none text-popover-foreground",
            "shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)]",
            "sm:max-w-4xl lg:max-w-5xl",
            contentClassName,
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_-10%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_55%),radial-gradient(90%_70%_at_100%_0%,color-mix(in_oklab,#60a5fa_22%,transparent),transparent_50%),radial-gradient(70%_60%_at_80%_100%,color-mix(in_oklab,#a78bfa_16%,transparent),transparent_55%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
          />

          <DialogHeader className="relative flex shrink-0 flex-row items-center justify-between gap-3 border-b border-hairline-cloud/80 px-5 py-4 sm:px-6 sm:py-5">
            <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
              {t("language")}
            </DialogTitle>
            <DialogClose
              render={
                <Button variant="ghost" size="icon-sm" className="shrink-0" />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="relative shrink-0 border-b border-hairline-cloud/80 px-4 py-3 sm:px-6">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
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
                className="h-11 rounded-xl border-hairline-cloud bg-popover pl-10 shadow-none [background-image:none]"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {groups.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("languageSearchEmpty")}
              </p>
            ) : (
              <div className="flex flex-col gap-6 sm:gap-8">
                {groups.map((group) => (
                  <LanguageSection
                    key={group.region}
                    title={regionLabel(group.region)}
                  >
                    <LanguageGrid
                      languages={group.languages}
                      value={value}
                      onSelect={handleSelect}
                    />
                  </LanguageSection>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
        <LanguageFlagBadge code={flagCode} size="sm" />
      ) : (
        <Languages
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

function LanguageSection({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <h3 className="mb-3 text-[0.72rem] font-bold tracking-[0.14em] text-muted-foreground uppercase sm:mb-3.5">
        {title}
      </h3>
      {children}
    </section>
  );
}

function LanguageGrid({
  languages,
  value,
  onSelect,
}: {
  languages: readonly WorkplaceLanguage[];
  value: string;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-2">
      {languages.map((language) => {
        const selected = language.code === value;
        return (
          <button
            key={language.code}
            type="button"
            onClick={() => onSelect(language.code)}
            aria-pressed={selected}
            className={cn(
              "group flex min-h-12 items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow,transform,border-color]",
              "border border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              selected
                ? "border-primary/25 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_22%,transparent),color-mix(in_oklab,#60a5fa_12%,transparent))] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
                : "hover:border-hairline-cloud hover:bg-surface-hover/80",
            )}
          >
            <LanguageFlagBadge
              code={language.flagCode}
              size="md"
              selected={selected}
            />
            <span className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold tracking-tight text-foreground">
              {language.name}
            </span>
            <Check
              className={cn(
                "size-4 shrink-0 transition-opacity",
                selected
                  ? "text-primary opacity-100"
                  : "opacity-0 group-hover:opacity-30",
              )}
              aria-hidden={!selected}
            />
          </button>
        );
      })}
    </div>
  );
}

function LanguageFlagBadge({
  code,
  size = "md",
  selected = false,
}: {
  code: string;
  size?: "sm" | "md";
  selected?: boolean;
}) {
  const dim = size === "sm" ? "size-[1.125rem]" : "size-5";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full",
        "ring-1 ring-black/10 dark:ring-white/15",
        selected && "ring-2 ring-primary/45",
        dim,
      )}
      aria-hidden
    >
      <CountryFlag
        code={code}
        square
        className="size-full rounded-none"
      />
    </span>
  );
}
