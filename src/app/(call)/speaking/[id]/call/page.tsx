import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SpeakingLockedPage } from "@/components/speaking/speaking-locked";
import { CallProvider } from "@/components/speaking/call-provider";
import { getSpeakingSession } from "@/lib/actions/speaking";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { isSpeakingJoinable } from "@/lib/speaking/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("speaking") };
}

export default async function SpeakingCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proAccess = await getCurrentProAccess();

  if (!proAccess.hasProAccess) {
    return (
      <div className="bg-background text-ink">
        <SpeakingLockedPage />
      </div>
    );
  }

  const session = await getSpeakingSession(id);
  if (!session) {
    redirect("/speaking");
  }

  if (!isSpeakingJoinable(session.status)) {
    redirect(`/speaking/${session.id}`);
  }

  return (
    <CallProvider sessionId={session.id} title={session.title} />
  );
}
