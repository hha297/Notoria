"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StreamTheme, useCall } from "@stream-io/video-react-sdk";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CallActive } from "@/components/speaking/call-active";
import { CallEnded } from "@/components/speaking/call-ended";
import { CallLobby } from "@/components/speaking/call-lobby";
import {
  connectSpeakingTutor,
  endSpeakingSession,
} from "@/lib/actions/speaking";
import { SPEAKING_MAX_SESSION_SECONDS } from "@/lib/billing/plans";
import { isSpeakingErrorCode } from "@/lib/speaking/errors";
import {
  SPEAKING_TUTOR_SETUP_TIMEOUT_MS,
  speakingDeadlineAt,
  speakingRemainingSeconds,
} from "@/lib/speaking/lifetime";

type CallUIProps = {
  sessionId: string;
  title: string;
  /** ISO timestamp of the original session start (preserved across refresh). */
  startedAt?: string | null;
  userName: string;
  userImage?: string | null;
};

export function CallUI({
  sessionId,
  title,
  startedAt = null,
  userName,
  userImage,
}: CallUIProps) {
  const call = useCall();
  const t = useTranslations("speaking.call");
  const tErrors = useTranslations("speaking.errors");
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
  const [joining, setJoining] = useState(false);
  const [effectiveStartedAt, setEffectiveStartedAt] = useState<string | null>(
    startedAt,
  );
  const leavingRef = useRef(false);

  const handleLeave = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setShow("ended");
    try {
      await call?.endCall();
    } catch {
      // The local call may already be disconnected.
    }
    try {
      await endSpeakingSession(sessionId);
    } catch (error) {
      const code = error instanceof Error ? error.message : "STREAM_CALL_FAILED";
      toast.error(
        isSpeakingErrorCode(code) ? tErrors(code) : tErrors("STREAM_CALL_FAILED"),
      );
    }
  }, [call, sessionId, tErrors]);

  async function handleJoin() {
    if (!call || joining) return;

    setJoining(true);
    try {
      await call.join();
      await call.microphone.enable();
    } catch {
      toast.error(tErrors("STREAM_CALL_FAILED"));
      setJoining(false);
      return;
    }

    // First join starts the fair-use clock if the server has not set startedAt yet.
    if (!effectiveStartedAt) {
      setEffectiveStartedAt(new Date().toISOString());
    }
    setShow("call");

    try {
      const connected = await Promise.race([
        connectSpeakingTutor(sessionId),
        new Promise<never>((_, reject) => {
          window.setTimeout(
            () => reject(new Error("TUTOR_SETUP_TIMEOUT")),
            SPEAKING_TUTOR_SETUP_TIMEOUT_MS,
          );
        }),
      ]);
      if (connected.startedAt) {
        setEffectiveStartedAt(connected.startedAt);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "STREAM_CALL_FAILED";
      if (code === "TUTOR_SETUP_TIMEOUT") {
        toast.error(t("tutorSetupTimeout"));
      } else {
        toast.error(
          isSpeakingErrorCode(code) ? tErrors(code) : t("tutorFailed"),
        );
      }
      // Bound failure: do not leave the learner connected without a tutor.
      await handleLeave();
    }
  }

  // Server-aligned deadline from original startedAt (not a fresh 30m on each enter).
  useEffect(() => {
    if (show !== "call") return;

    const tick = () => {
      const remaining = speakingRemainingSeconds(effectiveStartedAt);
      if (remaining == null) {
        // Clock not started on server yet — fall back to max window from local start.
        return;
      }
      if (remaining <= 0) {
        toast.message(t("sessionLimitReached"));
        void handleLeave();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [effectiveStartedAt, handleLeave, show, t]);

  // Fallback hard cap if startedAt never arrives (should be rare).
  useEffect(() => {
    if (show !== "call") return;
    if (effectiveStartedAt && speakingDeadlineAt(effectiveStartedAt)) return;
    const timer = window.setTimeout(() => {
      toast.message(t("sessionLimitReached"));
      void handleLeave();
    }, SPEAKING_MAX_SESSION_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [effectiveStartedAt, handleLeave, show, t]);

  return (
    <StreamTheme className="h-full">
      {show === "lobby" ? (
        <CallLobby
          sessionId={sessionId}
          userName={userName}
          userImage={userImage}
          joining={joining}
          onJoin={handleJoin}
        />
      ) : null}
      {show === "call" ? (
        <CallActive
          title={title}
          startedAt={effectiveStartedAt}
          onLeave={handleLeave}
        />
      ) : null}
      {show === "ended" ? <CallEnded sessionId={sessionId} /> : null}
    </StreamTheme>
  );
}
