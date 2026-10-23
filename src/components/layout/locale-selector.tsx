"use client";

import { Check, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { CountryFlag } from "@/components/layout/country-flag";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type AppLocale } from "@/i18n/config";
import { setAppLocale } from "@/lib/actions/locale";
import {
  getAllUiLocaleMeta,
  getPopularUiLocales,
  getUiLocaleMeta,
  type UiLocaleMeta,
} from "@/lib/i18n/ui-locales";
import { cn } from "@/lib/utils";

type LocaleSelectorProps = {
  value: AppLocale;
  /** Auth pages: shorter control height while keeping flag + full label. */
  compact?: boolean;
  /**
   * `chrome` = fixed-width header/auth trigger (code on narrow when compact).
   * `drawer` = flexible width, always shows the native language name.
   */
  appearance?: "chrome" | "drawer";
  className?: string;
};

export function LocaleSelector({
  value,
  compact = false,
  appearance = "chrome",
  className,
}: LocaleSelectorProps) {
  const router = useRouter();
  const t = useTranslations("header");
  const activeLocale = useLocale();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selected = getUiLocaleMeta(value);

  const popular = useMemo(() => getPopularUiLocales(value), [value]);
  const allLocales = useMemo(
    () =>
      [...getAllUiLocaleMeta()].sort((a, b) =>
        a.label.localeCompare(b.label, activeLocale),
      ),
    [activeLocale],
  );

  function handleSelect(nextValue: AppLocale) {
    if (nextValue === value) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      try {
        await setAppLocale(nextValue);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(t("changeLanguageFailed"));
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        aria-label={selected.label}
        title={selected.label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "control-surface overflow-hidden font-semibold [&_svg]:size-auto",
          appearance === "drawer"
            ? "h-9 min-w-0 flex-1 justify-start px-2.5 text-sm"
            : cn(
                /*
                  Stable width per breakpoint (not per language).
                  Compact/mobile: flag + uppercase locale code to save chrome space.
                  sm+: flag + native name with ellipsis.
                */
                "studio-chrome-control shrink-0 justify-center px-2 sm:px-2.5",
                compact
                  ? "h-9 w-[4.75rem] text-sm sm:h-10 sm:w-[9.5rem]"
                  : "h-10 w-[9.5rem] sm:w-[10.5rem]",
              ),
          className,
        )}
      >
        {/* dir=ltr keeps flag→label order for RTL locales without flipping chrome. */}
        <span
          dir="ltr"
          className={cn(
            "flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2",
            appearance === "drawer" ? "justify-start" : "justify-center",
          )}
        >
          <LocaleFlagBadge code={selected.flag} size="trigger" />
          {appearance === "drawer" ? (
            <span className="min-w-0 truncate text-left">{selected.label}</span>
          ) : compact ? (
            <>
              <span className="font-bold tracking-[0.06em] uppercase sm:hidden">
                {selected.code}
              </span>
              <span className="hidden min-w-0 truncate text-center sm:inline">
                {selected.label}
              </span>
            </>
          ) : (
            <span className="min-w-0 truncate text-center">{selected.label}</span>
          )}
        </span>
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
              {t("selectLanguage")}
            </DialogTitle>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <LocaleSection title={t("popularLanguages")}>
              <LocaleGrid
                locales={popular}
                value={value}
                pending={isPending}
                onSelect={handleSelect}
              />
            </LocaleSection>

            <LocaleSection
              title={t("allLanguages")}
              className="mt-6 sm:mt-8"
            >
              <LocaleGrid
                locales={allLocales}
                value={value}
                pending={isPending}
                onSelect={handleSelect}
              />
            </LocaleSection>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LocaleSection({
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

function LocaleGrid({
  locales,
  value,
  pending,
  onSelect,
}: {
  locales: UiLocaleMeta[];
  value: AppLocale;
  pending: boolean;
  onSelect: (locale: AppLocale) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-2">
      {locales.map((locale) => {
        const selected = locale.code === value;
        return (
          <button
            key={locale.code}
            type="button"
            disabled={pending}
            onClick={() => onSelect(locale.code)}
            aria-pressed={selected}
            className={cn(
              "group flex min-h-12 items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left transition-[background-color,box-shadow,transform,border-color]",
              "border border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              selected
                ? "border-primary/25 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_22%,transparent),color-mix(in_oklab,#60a5fa_12%,transparent))] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
                : "hover:border-hairline-cloud hover:bg-surface-hover/80",
            )}
          >
            <LocaleFlagBadge code={locale.flag} size="md" selected={selected} />
            <span className="min-w-0 flex-1 truncate text-[1rem] font-semibold tracking-tight text-foreground">
              {locale.label}
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

function LocaleFlagBadge({
  code,
  size = "md",
  selected = false,
}: {
  code: string;
  /** `trigger` = header control (slightly larger than list `sm`). */
  size?: "sm" | "trigger" | "md" | "lg";
  selected?: boolean;
}) {
  const dim =
    size === "sm"
      ? "size-[1.125rem]"
      : size === "trigger"
        ? "size-[1.25rem]"
        : size === "lg"
          ? "size-7"
          : "size-5";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 grow-0 overflow-hidden rounded-full",
        "ring-1 ring-black/10 dark:ring-white/15",
        selected && "ring-2 ring-primary",
        dim,
      )}
      aria-hidden
    >
      <CountryFlag
        code={code}
        square
        /* 1×1 flag + size-full fills the circle without crop-zoom. */
        className="size-full rounded-none"
      />
    </span>
  );
}
