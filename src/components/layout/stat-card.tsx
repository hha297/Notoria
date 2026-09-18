import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: ReactNode;
  featured?: boolean;
  className?: string;
};

export function StatCard({
  label,
  value,
  featured = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-hairline-cloud px-4 py-3",
        featured ? "bg-surface-active" : "bg-surface-elevated",
        className,
      )}
    >
      <p className="font-heading text-xl font-bold leading-none tracking-tight text-ink sm:text-2xl">
        {value}
      </p>
      <p className="mt-1.5 font-heading text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
