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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setWorkplaceLanguage } from "@/lib/actions/workplace";
import { WORKPLACE_LANGUAGES } from "@/lib/languages";

type WorkplaceSelectorProps = {
  value: string;
};

function LanguageOption({
  flagCode,
  name,
}: {
  flagCode: string;
  name: string;
}) {
  return (
    <>
      <CountryFlag code={flagCode} className="h-3.5 w-5" />
      <span>{name}</span>
    </>
  );
}

export function WorkplaceSelector({ value }: WorkplaceSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const current =
    WORKPLACE_LANGUAGES.find((language) => language.code === value) ??
    WORKPLACE_LANGUAGES[0];

  function handleChange(nextValue: string | null) {
    if (!nextValue || nextValue === value) {
      return;
    }

    startTransition(async () => {
      try {
        await setWorkplaceLanguage(nextValue);
        router.refresh();
      } catch {
        toast.error("Could not change workplace");
      }
    });
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger size="sm" className="min-w-[180px] bg-background">
          <SelectValue>
            <LanguageOption
              flagCode={current.flagCode}
              name={current.name}
            />
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectGroup>
            <SelectLabel>Selection</SelectLabel>
            {WORKPLACE_LANGUAGES.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                <LanguageOption
                  flagCode={language.flagCode}
                  name={language.name}
                />
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
