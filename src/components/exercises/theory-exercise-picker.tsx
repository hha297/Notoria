"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Clock, ListTree, Play, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { isKnownTheoryCategory } from "@/lib/theory/content";
import { cn } from "@/lib/utils";

export type TheoryExerciseCardItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  readingMinutes: number;
  estimatedExercises: number;
  sectionCount: number;
  updatedAt: string;
};

type TheoryExercisePickerProps = {
  theories: TheoryExerciseCardItem[];
};

export function TheoryExercisePicker({ theories }: TheoryExercisePickerProps) {
  const t = useTranslations("exercises.theory");
  const tTheory = useTranslations("theory");

  if (theories.length === 0) {
    return (
      <div className="empty-state">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
          <BookOpen className="size-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-ink">{t("emptyTitle")}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
        <LinkButton href="/theory/new" className="mt-5">
          <Plus className="size-4" />
          {t("emptyCta")}
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {theories.map((note) => {
        const categoryLabel = isKnownTheoryCategory(note.category)
          ? tTheory(`categories.${note.category}`)
          : note.category;

        return (
          <article
            key={note.id}
            className={cn(
              "group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-hairline-cloud bg-card p-5 transition-all",
              "hover:border-accent-lime/50 hover:shadow-[0_0_0_1px_rgba(194,239,78,0.35)]",
            )}
          >
            <div className="mb-4 flex shrink-0 items-start justify-between gap-2">
              <Badge variant="outline" className="w-fit">
                {categoryLabel}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {tTheory("readingTime", { minutes: note.readingMinutes })}
              </span>
            </div>

            <h3 className="line-clamp-2 min-h-[3.25rem] font-heading text-lg font-medium leading-snug text-ink transition-colors group-hover:text-accent-lime">
              {note.title}
            </h3>

            <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-muted-foreground">
              {note.description || "\u00a0"}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
              {note.sectionCount > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <ListTree className="size-3.5 shrink-0" aria-hidden />
                    <span>{t("sections", { count: note.sectionCount })}</span>
                  </span>
                  <span className="select-none opacity-50" aria-hidden>
                    ·
                  </span>
                </>
              ) : null}
              <span className="inline-flex items-center">
                {note.estimatedExercises > 0
                  ? t("estimatedExercises", { count: note.estimatedExercises })
                  : t("limitedExercises")}
              </span>
              <span className="select-none opacity-50" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center">
                {formatDistanceToNow(new Date(note.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            <div className="mt-auto flex items-center gap-2 pt-5">
              <Link
                href={`/exercises/theory/${note.id}`}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-background transition-opacity",
                  "hover:opacity-90",
                )}
              >
                <Play className="size-4" />
                {t("practice")}
              </Link>
              <Link
                href={`/theory/${note.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-hairline-cloud px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-accent-lime/40 hover:text-ink"
              >
                {t("view")}
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
