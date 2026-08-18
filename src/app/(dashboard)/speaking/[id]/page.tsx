import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { SpeakingLockedPage } from "@/components/speaking/speaking-locked";
import { SpeakingSessionView } from "@/components/speaking/speaking-session-view";
import { getSpeakingSession } from "@/lib/actions/speaking";
import { getCurrentProAccess } from "@/lib/auth/pro-access";

export const dynamic = "force-dynamic";

export default async function SpeakingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("speaking");
  const proAccess = await getCurrentProAccess();

  if (!proAccess.hasProAccess) {
    return <SpeakingLockedPage />;
  }

  const session = await getSpeakingSession(id);
  if (!session) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
      <div className="space-y-6">
        <Link
          href="/speaking"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={session.title}
          description={t("sessionDescription")}
        />
      </div>
      <SpeakingSessionView session={session} />
    </div>
  );
}
