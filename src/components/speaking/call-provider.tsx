"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { CallConnect } from "@/components/speaking/call-connect";

type CallProviderProps = {
  sessionId: string;
  title: string;
  startedAt?: string | null;
};

export function CallProvider({
  sessionId,
  title,
  startedAt = null,
}: CallProviderProps) {
  const { data, status } = useSession();

  if (status === "loading" || !data?.user?.id) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-module-speak-fg" />
      </div>
    );
  }

  return (
    <CallConnect
      sessionId={sessionId}
      title={title}
      startedAt={startedAt}
      userId={data.user.id}
      userName={data.user.name || "Learner"}
      userImage={data.user.image}
    />
  );
}
