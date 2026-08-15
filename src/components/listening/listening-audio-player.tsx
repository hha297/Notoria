"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatListeningDuration } from "@/lib/listening/utils";
import { cn } from "@/lib/utils";

type ListeningAudioPlayerProps = {
  src: string;
  mediaType?: string | null;
  className?: string;
  compact?: boolean;
  seekRequest?: { ms: number; nonce: number } | null;
};

export function ListeningAudioPlayer({
  src,
  mediaType,
  className,
  compact = false,
  seekRequest = null,
}: ListeningAudioPlayerProps) {
  const t = useTranslations("listening.player");
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isVideo = mediaType === "video";

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const onTime = () => setCurrentTime(media.currentTime);
    const onDuration = () => setDuration(media.duration || 0);
    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    media.addEventListener("timeupdate", onTime);
    media.addEventListener("loadedmetadata", onDuration);
    media.addEventListener("ended", onEnded);
    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);

    return () => {
      media.removeEventListener("timeupdate", onTime);
      media.removeEventListener("loadedmetadata", onDuration);
      media.removeEventListener("ended", onEnded);
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onPause);
    };
  }, [src]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !seekRequest) return;
    media.currentTime = Math.max(0, seekRequest.ms / 1000);
    void media.play();
  }, [seekRequest]);

  function togglePlay() {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      void media.play();
    } else {
      media.pause();
    }
  }

  function replay() {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = 0;
    void media.play();
  }

  function seek(value: number) {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = value;
    setCurrentTime(value);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-hairline-cloud bg-card p-4 sm:p-5",
        className,
      )}
    >
      {isVideo ? (
        <video
          ref={(node) => {
            mediaRef.current = node;
          }}
          src={src}
          className="mb-4 max-h-64 w-full rounded-xl bg-ink object-contain"
          playsInline
        />
      ) : (
        <audio
          ref={(node) => {
            mediaRef.current = node;
          }}
          src={src}
          preload="metadata"
        />
      )}

      <div className={cn("flex items-center gap-3", compact && "gap-2")}>
        <Button
          type="button"
          size="icon"
          onClick={togglePlay}
          aria-label={playing ? t("pause") : t("play")}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={replay}
          aria-label={t("replay")}
        >
          <RotateCcw className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(event) => seek(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--accent-lime,#c6e35b)]"
            style={{
              background: `linear-gradient(to right, var(--accent-lime, #c6e35b) ${progress}%, var(--muted) ${progress}%)`,
            }}
            aria-label={t("seek")}
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{formatListeningDuration(currentTime) ?? "00:00"}</span>
            <span>{formatListeningDuration(duration) ?? "00:00"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
