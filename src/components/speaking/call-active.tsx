"use client";

import { useEffect, useRef, useState } from "react";
import {
  CallControls,
  SpeakerLayout,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogoWordmark } from "@/components/ui/logo";
import { nextSpeakingInactivityState } from "@/lib/speaking/inactivity";
import {
  SPEAKING_ACTIVITY_HOLD_MS,
  formatSpeakingClock,
  speakingElapsedSeconds,
} from "@/lib/speaking/lifetime";

type CallActiveProps = {
  title: string;
  /** ISO timestamp when the fair-use / elapsed clock started. */
  startedAt?: string | null;
  onLeave: () => void;
};

export function CallActive({
  title,
  startedAt = null,
  onLeave,
}: CallActiveProps) {
  const t = useTranslations("speaking.call");
  const { useLocalParticipant, useMicrophoneState } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const { isMute } = useMicrophoneState();

  const [elapsedLabel, setElapsedLabel] = useState("0:00");
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null);

  const silentSinceRef = useRef<number | null>(null);
  const countdownEndsAtRef = useRef<number | null>(null);
  const phaseRef = useRef<"active" | "warning" | "ending">("active");
  const endingRef = useRef(false);
  const warnedToastRef = useRef(false);
  const activitySinceRef = useRef<number | null>(null);
  /** Raw unmuted speech signal from Stream (ignored entirely while muted). */
  const learnerSpeechRef = useRef(false);

  // Mic muted ⇒ idle. Stream can still set isSpeaking while muted (speakingWhileMuted).
  learnerSpeechRef.current =
    !isMute && Boolean(localParticipant?.isSpeaking);

  function continueCall() {
    silentSinceRef.current = null;
    countdownEndsAtRef.current = null;
    phaseRef.current = "active";
    activitySinceRef.current = null;
    warnedToastRef.current = false;
    setWarningSeconds(null);
  }

  useEffect(() => {
    const tickElapsed = () => {
      const elapsed = speakingElapsedSeconds(startedAt);
      setElapsedLabel(formatSpeakingClock(elapsed ?? 0));
    };
    tickElapsed();
    const timer = window.setInterval(tickElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (endingRef.current) return;
      const now = Date.now();
      const rawSpeech = learnerSpeechRef.current;

      // Ignore short isSpeaking blips so ambient noise cannot reset the window.
      let sustainedSpeech = false;
      if (rawSpeech) {
        if (activitySinceRef.current == null) {
          activitySinceRef.current = now;
        }
        sustainedSpeech =
          now - activitySinceRef.current >= SPEAKING_ACTIVITY_HOLD_MS;
      } else {
        activitySinceRef.current = null;
      }

      const next = nextSpeakingInactivityState({
        now,
        silentSince: silentSinceRef.current,
        phase: phaseRef.current,
        countdownEndsAt: countdownEndsAtRef.current,
        learnerSpeaking: sustainedSpeech,
      });
      silentSinceRef.current = next.silentSince;
      countdownEndsAtRef.current = next.countdownEndsAt;
      phaseRef.current = next.state.phase;

      if (next.state.phase === "warning") {
        setWarningSeconds(next.state.countdownSeconds);
        if (!warnedToastRef.current) {
          warnedToastRef.current = true;
          toast.warning(t("inactivityWarning"));
        }
      } else {
        setWarningSeconds(null);
        if (next.state.phase === "active") {
          warnedToastRef.current = false;
        }
      }

      if (next.shouldEnd) {
        endingRef.current = true;
        toast.message(t("inactivityEnded"));
        onLeave();
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [onLeave, t]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <LogoWordmark tone="sidebar" />
        <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-white/80">
          {title}
        </p>
        <p
          className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 font-mono text-sm tabular-nums text-white/90"
          title={t("elapsedTitle")}
          aria-label={t("elapsedTitle")}
        >
          {elapsedLabel}
        </p>
      </header>

      {warningSeconds != null ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="speaking-inactivity-title"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-sm rounded-xl border border-amber-400/40 bg-zinc-950 px-5 py-5 text-amber-50 shadow-xl">
            <p id="speaking-inactivity-title" className="text-base font-semibold">
              {t("inactivityWarning")}
            </p>
            <p className="mt-2 text-sm text-amber-100/90">
              {t("inactivityCountdown", { seconds: warningSeconds })}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-4 w-full"
              onClick={continueCall}
            >
              {t("continueCall")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <SpeakerLayout />
      </div>
      <div className="flex justify-center px-4 py-4">
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  );
}
