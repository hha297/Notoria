import { notFound } from "next/navigation";
import { SpeakingLockedPage } from "@/components/speaking/speaking-locked";
import { SpeakingSessionView } from "@/components/speaking/speaking-session-view";
import { getSpeakingSession } from "@/lib/actions/speaking";
import { getCurrentProAccess } from "@/lib/auth/pro-access";

export default async function SpeakingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proAccess = await getCurrentProAccess();

  if (!proAccess.hasProAccess) {
    return <SpeakingLockedPage />;
  }

  const session = await getSpeakingSession(id);
  if (!session) {
    notFound();
  }

  return <SpeakingSessionView session={session} />;
}
