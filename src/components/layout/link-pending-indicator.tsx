"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Inline pending hint for Next.js Link descendants.
 * Uses a delayed fade so instant/prefetched navigations do not flash.
 */
export function LinkPendingIndicator({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      data-pending={pending ? "true" : "false"}
      className={cn("notoria-link-pending", className)}
    />
  );
}
