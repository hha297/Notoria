"use client";

import { useEffect, useState } from "react";
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

type CallUIProps = {
  sessionId: string;
  title: string;
  userName: string;
  userImage?: string | null;
};

export function CallUI({
  sessionId,
  title,
  userName,
  userImage,
}: CallUIProps) {
  const call = useCall();
  const t = useTranslations("speaking.call");
  const tErrors = useTranslations("speaking.errors");
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
  const [joining, setJoining] = useState(false);

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

    setShow("call");

    try {
      await connectSpeakingTutor(sessionId);
    } catch (error) {
      const code = error instanceof Error ? error.message : "STREAM_CALL_FAILED";
      toast.error(
        isSpeakingErrorCode(code) ? tErrors(code) : t("tutorFailed"),
      );
    }
  }

  async function handleLeave() {
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
  }

  // Fair-use: one quota unit = one session; cap realtime duration.
  useEffect(() => {
    if (show !== "call") return;
    const timer = window.setTimeout(() => {
      toast.message(t("sessionLimitReached"));
      void handleLeave();
    }, SPEAKING_MAX_SESSION_SECONDS * 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

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
        <CallActive title={title} onLeave={handleLeave} />
      ) : null}
      {show === "ended" ? <CallEnded sessionId={sessionId} /> : null}
    </StreamTheme>
  );
}
