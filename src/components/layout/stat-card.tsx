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
        "rounded-xl border p-8",
        featured
          ? "border-hairline-violet bg-surface-night text-on-primary"
          : "border-hairline-cloud bg-card text-ink",
        className,
      )}
    >
      <p
        className={cn(
          "text-[30px] font-medium leading-tight",
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
