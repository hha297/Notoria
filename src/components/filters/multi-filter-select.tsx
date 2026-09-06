"use client";

import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatMultiFilterLabel,
  toggleMultiFilterValue,
  type MultiFilterValue,
} from "@/lib/filters/multi-select";
import { cn } from "@/lib/utils";

export type MultiFilterOption = {
  value: string;
  label: string;
};

export type MultiFilterOptionGroup = {
  label: string;
  options: MultiFilterOption[];
};

type MultiFilterSelectProps = {
  values: MultiFilterValue;
  onChange: (values: MultiFilterValue) => void;
  emptyLabel: string;
  options?: MultiFilterOption[];
  groups?: MultiFilterOptionGroup[];
  /** Optional caption above the trigger (e.g. exercise filter bars). */
  label?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  maxInlineLabels?: number;
};

export function MultiFilterSelect({
  values,
  onChange,
  emptyLabel,
  options = [],
  groups = [],
  label,
  className,
  triggerClassName,
  contentClassName,
  align = "start",
  maxInlineLabels = 2,
}: MultiFilterSelectProps) {
  const t = useTranslations("common");
  const labelByValue = new Map<string, string>();
  for (const option of options) {
    labelByValue.set(option.value, option.label);
  }
  for (const group of groups) {
    for (const option of group.options) {
      labelByValue.set(option.value, option.label);
    }
  }

  const display = formatMultiFilterLabel(
    values,
    (value) => labelByValue.get(value) ?? value,
    emptyLabel,
    (count) => t("selectedCount", { count }),
    maxInlineLabels,
  );

  function toggle(value: string) {
    onChange(toggleMultiFilterValue(values, value));
  }

  const trigger = (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-full min-w-0 justify-between gap-1.5 border-input bg-transparent px-2.5 font-normal normal-case tracking-normal shadow-none hover:bg-transparent dark:bg-input/30 dark:hover:bg-input/50",
          values.length > 0 && "border-accent-lime/40",
          triggerClassName,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{display}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("max-h-80 min-w-[var(--anchor-width)]", contentClassName)}
      >
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={values.includes(option.value)}
            onCheckedChange={() => toggle(option.value)}
            className="cursor-pointer"
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}

        {groups.map((group, index) => (
          <DropdownMenuGroup key={group.label}>
            {index > 0 || options.length > 0 ? (
              <DropdownMenuSeparator />
            ) : null}
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            {group.options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={values.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
                className="cursor-pointer"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}

        {values.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              className="flex w-full cursor-pointer items-center rounded-md px-1.5 py-1 text-sm text-muted-foreground outline-hidden hover:bg-accent hover:text-accent-foreground"
              onClick={() => onChange([])}
            >
              {t("clearFilter")}
            </button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (!label) {
    return <div className={className}>{trigger}</div>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {trigger}
    </div>
  );
}
