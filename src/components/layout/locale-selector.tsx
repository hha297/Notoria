"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { CountryFlag } from "@/components/layout/country-flag";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { locales, type AppLocale } from "@/i18n/config";
import { setAppLocale } from "@/lib/actions/locale";

/** Display labels; options are sorted alphabetically by label. */
const LOCALE_META: Record<AppLocale, { label: string; flag: string }> = {
  en: { label: "English", flag: "GB" },
  fi: { label: "Suomi", flag: "FI" },
  sv: { label: "Svenska", flag: "SE" },
  vi: { label: "Tiếng Việt", flag: "VN" },
};

const SORTED_LOCALES = [...locales].sort((a, b) =>
  LOCALE_META[a].label.localeCompare(LOCALE_META[b].label, "en"),
);

type LocaleSelectorProps = {
  value: AppLocale;
};

export function LocaleSelector({ value }: LocaleSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextValue: string | null) {
    if (!nextValue || nextValue === value) {
      return;
    }

    startTransition(async () => {
      try {
        await setAppLocale(nextValue);
        router.refresh();
      } catch {
        toast.error("Could not change UI language");
      }
    });
  }

  return (
    <div className="shrink-0">
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger
          aria-label={LOCALE_META[value].label}
          className="control-surface h-10 w-auto shrink-0 px-2 sm:min-w-[148px] sm:px-2.5"
        >
          <SelectValue>
            <LocaleOption locale={value} compact />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {SORTED_LOCALES.map((locale) => (
              <SelectItem key={locale} value={locale}>
                <LocaleOption locale={locale} />
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function LocaleOption({
  locale,
  compact = false,
}: {
  locale: AppLocale;
  compact?: boolean;
}) {
  const meta = LOCALE_META[locale];
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CountryFlag code={meta.flag} className="h-3.5 w-5 shrink-0" />
      {/* Compact trigger: flag only below sm — avoids “E.” truncation; menu always shows label */}
      <span className={compact ? "hidden truncate sm:inline" : "truncate"}>
        {meta.label}
      </span>
    </span>
  );
}
