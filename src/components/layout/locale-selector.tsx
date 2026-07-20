"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  fi: "Suomi",
};

type LocaleSelectorProps = {
  value: AppLocale;
};

export function LocaleSelector({ value }: LocaleSelectorProps) {
  const router = useRouter();
  const t = useTranslations("header");
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
    <div className="flex min-w-0 items-center gap-2">
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger
          size="sm"
          className="min-w-0 w-[7.5rem] bg-background sm:w-auto sm:min-w-[140px]"
        >
          <SelectValue>{LOCALE_LABELS[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {locales.map((locale) => (
              <SelectItem key={locale} value={locale}>
                {LOCALE_LABELS[locale]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
