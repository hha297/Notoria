"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CollapsibleRefineProps = {
  /** Module tint for hover (same pattern as route-quiet-action / tutorial btn). */
  routeAction: "vocab" | "writing" | "listen";
  label: string;
  hideLabel: string;
  /** Search field — rendered on the same row as the Filters button. */
  search: ReactNode;
  /** Show a soft active indicator when filters are applied while collapsed. */
  active?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function CollapsibleRefine({
  routeAction,
  label,
  hideLabel,
  search,
  active = false,
  defaultOpen = false,
  children,
  className,
}: CollapsibleRefineProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <div className="min-w-0 flex-1">{search}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="route-quiet-action shrink-0"
          data-route-action={routeAction}
          aria-expanded={open}
          aria-controls={`refine-panel-${routeAction}`}
          onClick={() => setOpen((value) => !value)}
        >
          <ListFilter className="size-4" aria-hidden />
          <span className="hidden sm:inline">{open ? hideLabel : label}</span>
          {active && !open ? (
            <span
              className="size-1.5 shrink-0 rounded-full bg-current"
              aria-hidden
            />
          ) : null}
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </Button>
      </div>

      {open ? (
        <div
          id={`refine-panel-${routeAction}`}
          className="writing-refine writing-sheet-meta"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
