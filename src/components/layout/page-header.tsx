import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  highlight,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="heading-xl break-words text-ink">
          {highlight ? (
            <>
              {title}{" "}
              <span className="chip-lime">{highlight}</span>
            </>
          ) : (
            title
          )}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:max-w-full sm:shrink-0 sm:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
