"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { CallConnect } from "@/components/speaking/call-connect";

type CallProviderProps = {
  sessionId: string;
  title: string;
};

export function CallProvider({ sessionId, title }: CallProviderProps) {
  const { data, status } = useSession();

  if (status === "loading" || !data?.user?.id) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-accent-lime" />
      </div>
    );
  }

  return (
    <CallConnect
      sessionId={sessionId}
      title={title}
      userId={data.user.id}
      userName={data.user.name || "Learner"}
      userImage={data.user.image}
    />
  );
}
