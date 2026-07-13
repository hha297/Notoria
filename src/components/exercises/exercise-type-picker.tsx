import Link from "next/link";
import { cn } from "@/lib/utils";
import { EXERCISE_TYPES } from "@/lib/exercise-types";

export function ExerciseTypePicker() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {EXERCISE_TYPES.map((item) => (
        <Link
          key={item.slug}
          href={`/exercises/${item.slug}`}
          className={cn(
            "group relative flex flex-col overflow-hidden rounded-xl border border-hairline-cloud bg-card p-6 transition-all",
            "hover:border-accent-lime/50 hover:shadow-[0_0_0_1px_rgba(194,239,78,0.35)]",
          )}
        >
          <div
            className={cn(
              "mb-5 flex aspect-[4/3] items-center justify-center rounded-lg border border-hairline-cloud bg-muted/40 p-4 transition-colors",
              "group-hover:border-accent-lime/50 group-hover:bg-accent-lime/25",
            )}
          >
            <div className="w-full max-w-[140px] rounded-md border border-hairline-cloud bg-background p-3 shadow-sm transition-transform group-hover:-translate-y-0.5">
              <item.icon className="mb-2 size-4 text-accent-violet-mid" />
              <p className="font-heading text-sm leading-snug text-ink">
                {item.preview}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-heading text-lg font-medium text-ink transition-colors group-hover:text-accent-lime">
              {item.label}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
