import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Shared shell for top-level dashboard pages (home, vocabulary, writing, exercises).
 * Nesting extra max-width wrappers here makes pages look uneven.
 */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("w-full min-w-0 max-w-full space-y-8", className)}>
      {children}
    </div>
  );
}
