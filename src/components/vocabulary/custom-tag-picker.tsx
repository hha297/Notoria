"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CustomTagOption = {
  id: string;
  label: string;
  count: number;
};

type CustomTagPickerProps = {
  options: CustomTagOption[];
  value: string | null;
  onChange: (tagId: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  noResultsLabel: string;
  className?: string;
};

export function CustomTagPicker({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  noResultsLabel,
  className,
}: CustomTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  if (options.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyLabel}</p>;
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-11 w-full justify-between gap-2 px-3 font-medium",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {selected ? (
            <>
              {selected.label}
              <span className="ms-2 text-muted-foreground tabular-nums">
                {selected.count}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 w-[var(--anchor-width)] min-w-[min(100%,18rem)] p-0"
      >
        <div
          className="sticky top-0 z-10 border-b border-hairline-cloud bg-popover px-2 py-2"
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 border-input pl-8 text-sm shadow-none"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto overscroll-contain p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {noResultsLabel}
            </p>
          ) : (
            filtered.map((option) => {
              const active = option.id === value;
              return (
                <DropdownMenuItem
                  key={option.id}
                  className="cursor-pointer gap-2"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      active ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {option.count}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
