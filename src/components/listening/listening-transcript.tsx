"use client";

import type { KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import exerciseStyles from "@/components/style/listening/exercise.module.css";
import {
  getTranscriptTurns,
  speakerDisplayName,
} from "@/lib/listening/speakers";
import type { ListeningTranscriptionData } from "@/lib/listening/types";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type ListeningTranscriptProps = {
  transcript: string;
  transcriptionData: ListeningTranscriptionData | null;
  onSeekMs?: (startMs: number) => void;
};

export function ListeningTranscript({
  transcript,
  transcriptionData,
  onSeekMs,
}: ListeningTranscriptProps) {
  const t = useTranslations("listening");
  const tPlayer = useTranslations("listening.player");
  const turns = getTranscriptTurns(
    transcript,
    transcriptionData?.utterances,
    transcriptionData?.sentences,
  );
  const showSpeakers = turns.some((turn) => turn.speaker);

  const speakerIndex = new Map<string, number>();
  for (const turn of turns) {
    if (turn.speaker && !speakerIndex.has(turn.speaker)) {
      speakerIndex.set(turn.speaker, speakerIndex.size);
    }
  }

  return (
    <section
      className="rounded-xl border border-hairline-cloud bg-surface-elevated/50 p-4 sm:p-5"
      aria-label={t("transcript")}
    >
      <h2 className={mx(exerciseStyles, "eyebrow")}>{t("transcript")}</h2>
      <div className="mt-3 space-y-2.5">
        {turns.map((turn) => {
          const interactive = Boolean(onSeekMs) && turn.start != null;
          const toneIndex = turn.speaker
            ? (speakerIndex.get(turn.speaker) ?? 0) % 3
            : -1;
          const name = turn.speaker
            ? speakerDisplayName(
                { speaker: turn.speaker, displayName: turn.displayName },
                (id) => t("speakerLabel", { id }),
              )
            : null;

          return (
            <div
              key={`${turn.speaker ?? "line"}-${turn.start ?? "x"}-${turn.order}`}
              data-speaker={turn.speaker ?? undefined}
              data-start={turn.start ?? undefined}
              data-end={turn.end ?? undefined}
              className={cn(
                "rounded-lg border border-hairline-cloud border-l-[3px] px-3.5 py-2.5",
                toneIndex === 0 && "border-l-[var(--module-listen-fg)] bg-[color-mix(in_oklab,var(--module-listen-bg)_42%,transparent)]",
                toneIndex === 1 && "border-l-ink/35 bg-muted/40",
                toneIndex === 2 && "border-l-hairline-cloud bg-card/60",
                toneIndex < 0 && "border-l-hairline-cloud bg-muted/25",
                interactive &&
                  "cursor-pointer transition-colors hover:border-[color-mix(in_oklab,var(--module-listen-fg)_45%,var(--hairline-cloud))]",
              )}
              {...(interactive
                ? {
                    role: "button" as const,
                    tabIndex: 0,
                    "aria-label": tPlayer("playSegment"),
                    onClick: () => onSeekMs?.(turn.start ?? 0),
                    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSeekMs?.(turn.start ?? 0);
                      }
                    },
                  }
                : {})}
            >
              {showSpeakers && name ? (
                <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {name}
                </p>
              ) : null}
              <p
                className={cn(
                  "text-sm leading-relaxed text-ink sm:text-[0.95rem]",
                  showSpeakers && name && "mt-1",
                )}
              >
                {turn.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
