"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { CountryFlag } from "@/components/layout/country-flag";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeFirstLanguageOnboarding } from "@/lib/actions/onboarding";
import { WORKPLACE_LANGUAGES, type WorkplaceLanguage } from "@/lib/languages";
import {
  requestFirstEntryOnboarding,
  requestWorkspaceOnboarding,
} from "@/lib/onboarding/storage";
import { cn } from "@/lib/utils";

/**
 * Reusable post-auth onboarding: choose the first learning language.
 * Email/password and Google OAuth both land here for new users.
 */
export function LearningLanguageOnboarding() {
  const router = useRouter();
  const t = useTranslations("learningOnboarding");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const languages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return WORKPLACE_LANGUAGES;
    }

    return WORKPLACE_LANGUAGES.filter(
      (language) =>
        language.name.toLowerCase().includes(normalized) ||
        language.code.toLowerCase().includes(normalized),
    );
  }, [query]);

  const selectedLanguage = selected
    ? WORKPLACE_LANGUAGES.find((language) => language.code === selected)
    : undefined;

  function handleContinue() {
    if (!selected || isPending) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await completeFirstLanguageOnboarding({
          language: selected,
        });
        requestFirstEntryOnboarding();
        requestWorkspaceOnboarding(result.workspaceId);
        router.replace("/");
        router.refresh();
      } catch (err) {
        if (err instanceof Error && err.message === "INVALID_LANGUAGE") {
          setError(t("invalidLanguage"));
          setSelected(null);
          return;
        }
        setError(t("error"));
      }
    });
  }

  return (
    <div className="learning-onboarding-shell relative isolate flex min-h-svh items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="learning-onboarding relative z-10 flex w-full max-w-xl flex-col gap-5">
        <header className="learning-onboarding-hero flex flex-col">
          <div
            className="learning-onboarding-brand mb-4 inline-flex items-center gap-2.5"
            aria-hidden
          >
            <Logo size="md" />
            <LogoWordmark
              tone="ink"
              className="learning-onboarding-wordmark text-[clamp(1.45rem,3.8vw,1.75rem)] tracking-tight"
            />
          </div>

          <p className="learning-onboarding-step m-0 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--module-home-fg)]">
            {t("step")}
          </p>
          <h1 className="learning-onboarding-title mt-1.5 font-heading text-[clamp(1.7rem,4.5vw,2.2rem)] font-bold leading-tight tracking-tight text-ink">
            {t("title")}
          </h1>
          <p className="learning-onboarding-lede mt-2 max-w-md text-base leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <section
          className="learning-onboarding-panel flex flex-col gap-4 rounded-[0.95rem] border border-hairline-cloud bg-surface-elevated/70 p-4 sm:gap-5 sm:p-5"
          aria-labelledby="learning-onboarding-heading"
        >
          <h2 id="learning-onboarding-heading" className="sr-only">
            {t("title")}
          </h2>

          <div className="learning-onboarding-search relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 rounded-xl pl-10"
              disabled={isPending}
              autoComplete="off"
              aria-label={t("searchPlaceholder")}
            />
          </div>

          <div
            className="learning-onboarding-list grid max-h-[min(42svh,22rem)] grid-cols-1 gap-2 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] py-0.5 sm:max-h-[min(48svh,26rem)] sm:grid-cols-2"
            role="radiogroup"
            aria-label={t("title")}
          >
            {languages.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                {t("noResults")}
              </p>
            ) : (
              languages.map((language) => (
                <LanguageOption
                  key={language.code}
                  language={language}
                  selected={selected === language.code}
                  disabled={isPending}
                  onSelect={() => {
                    setSelected(language.code);
                    setError(null);
                  }}
                />
              ))
            )}
          </div>

          {selectedLanguage ? (
            <p
              className="flex items-start gap-2 rounded-xl bg-surface-muted/60 px-3 py-2.5 text-sm leading-snug text-muted-foreground"
              aria-live="polite"
            >
              <CountryFlag
                code={selectedLanguage.flagCode}
                className="mt-0.5 h-3.5 w-5 shrink-0"
              />
              <span>{selectedLanguage.preview}</span>
            </p>
          ) : null}

          {error ? (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="h-11 w-full shrink-0 bg-primary font-bold text-primary-foreground hover:bg-primary-hover"
            disabled={!selected || isPending}
            onClick={handleContinue}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {isPending ? t("continuing") : t("continue")}
          </Button>
        </section>
      </div>
    </div>
  );
}

function LanguageOption({
  language,
  selected,
  disabled,
  onSelect,
}: {
  language: WorkplaceLanguage;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full min-h-11 items-center gap-2.5 rounded-xl border border-hairline-cloud bg-surface-elevated/80 px-3 py-2.5 text-left transition-colors",
        "hover:border-primary/35 hover:bg-muted/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-70",
        selected &&
          "border-primary/60 bg-primary/15 ring-1 ring-primary/30",
      )}
    >
      <CountryFlag
        code={language.flagCode}
        className="h-4 w-6 shrink-0 rounded-sm"
      />
      <span className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold text-ink">
        {language.name}
      </span>
      <span
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-transparent",
        )}
        aria-hidden={!selected}
      >
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
    </button>
  );
}
