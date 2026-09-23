import { notFound } from "next/navigation";
import { SpeakingSessionView } from "@/components/speaking/speaking-session-view";
import { getSpeakingSession } from "@/lib/actions/speaking";

export default async function SpeakingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSpeakingSession(id);
  if (!session) {
    notFound();
  }

  return <SpeakingSessionView session={session} />;
}
