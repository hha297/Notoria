"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import playerStyles from "@/components/style/listening/audio-player.module.css";
import { mx } from "@/lib/css-module";
import { formatListeningDuration } from "@/lib/listening/utils";
import { cn } from "@/lib/utils";

type ListeningAudioPlayerProps = {
  src: string;
  mediaType?: string | null;
  className?: string;
  compact?: boolean;
  label?: string;
  seekRequest?: { ms: number; nonce: number } | null;
};

export function ListeningAudioPlayer({
  src,
  mediaType,
  className,
  compact = false,
  label,
  seekRequest = null,
}: ListeningAudioPlayerProps) {
  const t = useTranslations("listening.player");
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const isVideo = mediaType === "video";

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const onTime = () => setCurrentTime(media.currentTime);
    const onDuration = () => setDuration(media.duration || 0);
    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setFailed(true);

    media.addEventListener("timeupdate", onTime);
    media.addEventListener("loadedmetadata", onDuration);
    media.addEventListener("ended", onEnded);
    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);
    media.addEventListener("error", onError);

    return () => {
      media.removeEventListener("timeupdate", onTime);
      media.removeEventListener("loadedmetadata", onDuration);
      media.removeEventListener("ended", onEnded);
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onPause);
      media.removeEventListener("error", onError);
    };
  }, [src]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !seekRequest) return;
    media.currentTime = Math.max(0, seekRequest.ms / 1000);
    void media.play().catch(() => setFailed(true));
  }, [seekRequest]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.volume = muted ? 0 : volume;
    media.muted = muted;
  }, [muted, volume]);

  function togglePlay() {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      void media.play().catch(() => setFailed(true));
    } else {
      media.pause();
    }
  }

  function replay() {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = 0;
    void media.play().catch(() => setFailed(true));
  }

  function seek(value: number) {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = value;
    setCurrentTime(value);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remaining = Math.max(0, duration - currentTime);

  return (
    <div
      className={cn(mx(playerStyles, "player"), className)}
      data-compact={compact ? "true" : "false"}
    >
      {label ? <p className={mx(playerStyles, "label")}>{label}</p> : null}

      {isVideo ? (
        <video
          ref={(node) => {
            mediaRef.current = node;
          }}
          src={src}
          className="max-h-56 w-full rounded-xl bg-ink object-contain"
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

      <div className={mx(playerStyles, "row")}>
        <button
          type="button"
          className={mx(playerStyles, "play")}
          data-compact={compact ? "true" : "false"}
          onClick={togglePlay}
          aria-label={playing ? t("pause") : t("play")}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button
          type="button"
          className={mx(playerStyles, "ghost")}
          onClick={replay}
          aria-label={t("replay")}
        >
          <RotateCcw className="size-4" />
        </button>
        <div className={mx(playerStyles, "seekBlock")}>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(event) => seek(Number(event.target.value))}
            className={mx(playerStyles, "seek")}
            style={{
              background: `linear-gradient(to right, var(--primary) ${progress}%, var(--muted) ${progress}%)`,
            }}
            aria-label={t("seek")}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
          />
          <div className={mx(playerStyles, "times")}>
            <span>{formatListeningDuration(currentTime) ?? "00:00"}</span>
            <span>
              -{formatListeningDuration(remaining) ?? "00:00"}
            </span>
          </div>
        </div>
      </div>

      <div className={mx(playerStyles, "tools")}>
        <div className={mx(playerStyles, "volume")}>
          <button
            type="button"
            className={mx(playerStyles, "ghost")}
            style={{ width: "2rem", height: "2rem" }}
            onClick={() => setMuted((value) => !value)}
            aria-label={muted || volume === 0 ? t("unmute") : t("mute")}
          >
            {muted || volume === 0 ? (
              <VolumeX className="size-3.5 text-muted-foreground" />
            ) : (
              <Volume2 className="size-3.5 text-muted-foreground" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              setMuted(next === 0);
            }}
            className={mx(playerStyles, "volumeSeek")}
            aria-label={t("volume")}
          />
        </div>
      </div>

      {failed ? (
        <p className={mx(playerStyles, "error")} role="alert">
          {t("loadError")}
        </p>
      ) : null}
    </div>
  );
}
