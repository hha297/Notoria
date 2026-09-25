"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
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
  /** Show an in-menu search field (useful for long option lists). */
  searchable?: boolean;
  searchPlaceholder?: string;
};

function matchesQuery(label: string, query: string) {
  if (!query) return true;
  return label.toLowerCase().includes(query);
}

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
  searchable = false,
  searchPlaceholder,
}: MultiFilterSelectProps) {
  const t = useTranslations("common");
  const tSearch = useTranslations("search");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const labelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of options) {
      map.set(option.value, option.label);
    }
    for (const group of groups) {
      for (const option of group.options) {
        map.set(option.value, option.label);
      }
    }
    return map;
  }, [groups, options]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !normalizedQuery) return options;
    return options.filter((option) =>
      matchesQuery(option.label, normalizedQuery),
    );
  }, [normalizedQuery, options, searchable]);

  const filteredGroups = useMemo(() => {
    if (!searchable || !normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) =>
          matchesQuery(option.label, normalizedQuery),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, normalizedQuery, searchable]);

  const display = formatMultiFilterLabel(
    values,
    (value) => labelByValue.get(value) ?? value,
    emptyLabel,
    (count) => t("selectedCount", { count }),
    maxInlineLabels,
  );

  const hasVisibleOptions =
    filteredOptions.length > 0 || filteredGroups.length > 0;

  function toggle(value: string) {
    onChange(toggleMultiFilterValue(values, value));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  const trigger = (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-10 w-full min-w-0 justify-between gap-1.5 border-input px-2.5 font-normal normal-case tracking-normal shadow-none",
          values.length > 0 && "border-accent-lime/40",
          triggerClassName,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{display}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn(
          "max-h-80 min-w-[var(--anchor-width)] max-sm:max-w-[calc(100vw-2rem)] max-sm:min-w-0",
          contentClassName,
        )}
      >
        {searchable ? (
          <div
            className="sticky top-0 z-10 -mx-1 mb-1 border-b border-hairline-cloud menu-surface px-1.5 pb-1.5 pt-0.5"
            onKeyDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  searchPlaceholder ?? tSearch("placeholder")
                }
                className="h-8 border-input pl-7 text-sm shadow-none"
                autoFocus
              />
            </div>
          </div>
        ) : null}

        {filteredOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={values.includes(option.value)}
            onCheckedChange={() => toggle(option.value)}
            className="cursor-pointer"
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}

        {filteredGroups.map((group, index) => (
          <DropdownMenuGroup key={group.label}>
            {index > 0 || filteredOptions.length > 0 ? (
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

        {!hasVisibleOptions ? (
          <p className="px-1.5 py-2 text-sm text-muted-foreground">
            {tSearch("noResults", { query: query.trim() || "—" })}
          </p>
        ) : null}

        {values.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer gap-1.5"
              onClick={() => onChange([])}
            >
              <X className="size-4" aria-hidden />
              {t("clearFilter")}
            </DropdownMenuItem>
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
