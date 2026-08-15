"use client";

import type { KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import {
  getTranscriptTurns,
  speakerDisplayName,
} from "@/lib/listening/speakers";
import type { ListeningTranscriptionData } from "@/lib/listening/types";
import { cn } from "@/lib/utils";

const SPEAKER_TONES = [
  "border-l-accent-lime bg-accent-lime/10",
  "border-l-ink/30 bg-muted/50",
  "border-l-hairline-cloud bg-card",
] as const;

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
    <section className="card-surface space-y-4">
      <h2 className="heading-md">{t("transcript")}</h2>
      <div className="space-y-3">
        {turns.map((turn) => {
          const interactive = Boolean(onSeekMs) && turn.start != null;
          const tone = turn.speaker
            ? SPEAKER_TONES[(speakerIndex.get(turn.speaker) ?? 0) % SPEAKER_TONES.length]
            : "border-l-hairline-cloud bg-muted/30";
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
                "rounded-xl border border-hairline-cloud border-l-[3px] px-4 py-3",
                tone,
                interactive && "cursor-pointer transition-colors hover:border-accent-lime/60",
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
                <p className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
                  {name}
                </p>
              ) : null}
              <p
                className={cn(
                  "text-sm leading-relaxed text-ink sm:text-base",
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
