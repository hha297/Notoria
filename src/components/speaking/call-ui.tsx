"use client";

import { useState } from "react";
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
