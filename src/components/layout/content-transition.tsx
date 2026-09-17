"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContentTransitionProps = {
  /** Change this when the visible panel swaps (tab/mode/filter view). */
  transitionKey: string;
  children: ReactNode;
  className?: string;
};

/**
 * Subtle enter animation for in-page tab/mode swaps.
 * No artificial delay — content renders immediately under the animation.
 */
export function ContentTransition({
  transitionKey,
  children,
  className,
}: ContentTransitionProps) {
  return (
    <div
      key={transitionKey}
      className={cn("notoria-content-enter min-w-0 w-full max-w-full", className)}
    >
      {children}
    </div>
  );
}
