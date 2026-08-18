"use client";

import {
  DefaultVideoPlaceholder,
  type StreamVideoParticipant,
  ToggleAudioPreviewButton,
  ToggleVideoPreviewButton,
  useCallStateHooks,
  VideoPreview,
} from "@stream-io/video-react-sdk";
import { Loader2, LogInIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { speakingAvatarUri } from "@/lib/speaking/stream";

type CallLobbyProps = {
  sessionId: string;
  userName: string;
  userImage?: string | null;
  joining?: boolean;
  onJoin: () => void;
};

function DisabledVideoPreview({
  userName,
  userImage,
}: {
  userName: string;
  userImage?: string | null;
}) {
  return (
    <DefaultVideoPlaceholder
      participant={
        {
          name: userName,
          image: userImage || speakingAvatarUri(userName, "initials"),
        } as StreamVideoParticipant
      }
    />
  );
}

export function CallLobby({
  sessionId,
  userName,
  userImage,
  joining = false,
  onJoin,
}: CallLobbyProps) {
  const t = useTranslations("speaking.call");
  const { useMicrophoneState } = useCallStateHooks();
  const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
  const canJoin = hasMicPermission && !joining;

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="space-y-2">
        <h1 className="heading-xl text-white">{t("lobbyTitle")}</h1>
        <p className="max-w-md text-sm text-white/70">{t("lobbyDescription")}</p>
      </div>

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1524]">
        <VideoPreview
          DisabledVideoPreview={() => (
            <DisabledVideoPreview userName={userName} userImage={userImage} />
          )}
          NoCameraPreview={() => (
            <DisabledVideoPreview userName={userName} userImage={userImage} />
          )}
        />
      </div>

      {!hasMicPermission ? (
        <p className="max-w-md text-sm text-amber-200">{t("permissions")}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <ToggleAudioPreviewButton />
        <ToggleVideoPreviewButton />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/speaking/${sessionId}`}
          className="inline-flex h-10 items-center rounded-md border border-white/25 bg-white/10 px-4 text-sm font-bold uppercase tracking-[0.2px] text-white hover:bg-white/20"
        >
          {t("cancel")}
        </Link>
        <button
          type="button"
          onClick={onJoin}
          disabled={!canJoin}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent-lime px-4 text-sm font-bold uppercase tracking-[0.2px] text-ink hover:bg-accent-lime/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joining ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogInIcon className="size-4" />
          )}
          {joining ? t("joining") : t("join")}
        </button>
      </div>
    </div>
  );
}
