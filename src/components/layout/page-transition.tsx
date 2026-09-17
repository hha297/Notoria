"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Remounts on pathname change (via dashboard template) and applies a short
 * enter animation. Does not delay navigation or data loading.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={cn("notoria-page-enter min-w-0 w-full max-w-full", className)}
    >
      {children}
    </div>
  );
}
