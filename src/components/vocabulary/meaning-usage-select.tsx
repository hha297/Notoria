"use client";

import { Tag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { composerStyles } from "@/components/vocabulary/vocabulary-composer";
import { mx } from "@/lib/css-module";
import {
  MEANING_USAGE_IDS,
  resolveMeaningUsageLabel,
  type MeaningUsageId,
} from "@/lib/vocabulary/meaning-usage";
import { cn } from "@/lib/utils";

type MeaningUsageSelectProps = {
  value: MeaningUsageId[];
  onChange: (labels: MeaningUsageId[]) => void;
  className?: string;
};

function useMeaningUsageLabels(
  value: MeaningUsageId[],
  onChange: (labels: MeaningUsageId[]) => void,
) {
  const t = useTranslations("vocabulary.usageLabels");
  const tTags = useTranslations("tags");

  function labelFor(id: MeaningUsageId) {
    return resolveMeaningUsageLabel(id, (key) => tTags(key));
  }

  function toggle(id: MeaningUsageId) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    onChange(
      MEANING_USAGE_IDS.filter((item) => item === id || value.includes(item)),
    );
  }

  function remove(id: MeaningUsageId) {
    onChange(value.filter((item) => item !== id));
  }

  function clear() {
    onChange([]);
  }

  return { t, labelFor, toggle, remove, clear };
}

/** Compact trigger — keep beside the meaning input. */
export function MeaningUsageTrigger({
  value,
  onChange,
  className,
}: MeaningUsageSelectProps) {
  const { t, labelFor, toggle, clear } = useMeaningUsageLabels(value, onChange);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("aria")}
        className={cn(
          mx(composerStyles, "vocab-usage-trigger"),
          "inline-flex h-full shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold",
          className,
        )}
      >
        <Tag className="size-4" aria-hidden />
        <span>
          {value.length === 0
            ? t("add")
            : t("count", { count: value.length })}
        </span>
      </DropdownMenuTrigger>
      {/* Portaled: pin hover to meanings success green. */}
      <DropdownMenuContent
        align="end"
        className="vocab-usage-menu min-w-48"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("menuTitle")}</DropdownMenuLabel>
          {MEANING_USAGE_IDS.map((id) => (
            <DropdownMenuCheckboxItem
              key={id}
              data-usage-id={id}
              checked={value.includes(id)}
              className="cursor-pointer"
              onCheckedChange={() => toggle(id)}
            >
              {labelFor(id)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {value.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={clear}>
              {t("clear")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Selected usage chips — render below the meaning input. */
export function MeaningUsageChips({
  value,
  onChange,
  className,
}: MeaningUsageSelectProps) {
  const { t, labelFor, remove } = useMeaningUsageLabels(value, onChange);

  if (value.length === 0) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5",
        className,
      )}
    >
      {value.map((id) => {
        const label = labelFor(id);
        return (
          <span key={id} className={mx(composerStyles, "vocab-usage-chip")}>
            <span className="truncate">{label}</span>
            <button
              type="button"
              className={mx(composerStyles, "vocab-usage-chip-remove")}
              aria-label={t("remove", { label })}
              onClick={() => remove(id)}
            >
              <X className="size-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

/** @deprecated Prefer MeaningUsageTrigger + MeaningUsageChips for layout control. */
export function MeaningUsageSelect(props: MeaningUsageSelectProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <MeaningUsageTrigger {...props} />
      <MeaningUsageChips {...props} />
    </div>
  );
}
