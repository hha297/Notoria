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
        "rounded-xl border p-4 sm:p-6 md:p-8",
        featured
          ? "border-hairline-violet bg-surface-night text-on-primary"
          : "border-hairline-cloud bg-card text-ink",
        className,
      )}
    >
      <p
        className={cn(
          "text-2xl font-medium leading-tight sm:text-[30px]",
          featured ? "text-on-primary" : "text-ink",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-2 text-sm font-medium",
          featured ? "text-on-dark-muted" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
    </div>
  );
}
