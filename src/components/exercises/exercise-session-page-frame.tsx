import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ExerciseTypeSlug } from "@/lib/exercise-types";

type ExerciseSessionPageFrameProps = {
  slug: ExerciseTypeSlug;
  title: string;
  backLabel: string;
  sourceLabel?: string;
  backHref?: string;
  children: ReactNode;
};

export function ExerciseSessionPageFrame({
  slug,
  title,
  backLabel,
  sourceLabel,
  backHref = "/exercises",
  children,
}: ExerciseSessionPageFrameProps) {
  return (
    <div
      data-exercise={slug}
      className="w-full min-w-0 space-y-6 pt-1 sm:space-y-8"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem]">
            {title}
          </h1>
        </div>
        {sourceLabel ? (
          <p className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:text-right">
            {sourceLabel}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
