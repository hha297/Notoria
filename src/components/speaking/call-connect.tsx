"use client";

import { useEffect, useState } from "react";
import {
  Call,
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { CallUI } from "@/components/speaking/call-ui";
import { generateSpeakingToken } from "@/lib/actions/speaking";
import { speakingAvatarUri } from "@/lib/speaking/stream";

type CallConnectProps = {
  sessionId: string;
  title: string;
  userId: string;
  userName: string;
  userImage?: string | null;
};

export function CallConnect({
  sessionId,
  title,
  userId,
  userName,
  userImage,
}: CallConnectProps) {
  const t = useTranslations("speaking.call");
  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
  const [client, setClient] = useState<StreamVideoClient>();
  const [call, setCall] = useState<Call>();

  useEffect(() => {
    if (!apiKey) return;

    const videoClient = new StreamVideoClient({
      apiKey,
      user: {
        id: userId,
        name: userName,
        image: userImage || speakingAvatarUri(userName, "initials"),
      },
      tokenProvider: generateSpeakingToken,
    });

    setClient(videoClient);

    return () => {
      void videoClient.disconnectUser();
      setClient(undefined);
    };
  }, [apiKey, userId, userImage, userName]);

  useEffect(() => {
    if (!client) return;

    const nextCall = client.call("default", sessionId);
    void nextCall.camera.disable();
    setCall(nextCall);

    return () => {
      if (nextCall.state.callingState !== CallingState.LEFT) {
        void nextCall.leave();
      }
      setCall(undefined);
    };
  }, [client, sessionId]);

  if (!apiKey) {
    return (
      <p className="px-4 py-16 text-center text-sm text-white/70">
        {t("notConfigured")}
      </p>
    );
  }

  if (!client || !call) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-accent-lime" />
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallUI
          sessionId={sessionId}
          title={title}
          userName={userName}
          userImage={userImage}
        />
      </StreamCall>
    </StreamVideo>
  );
}
