import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GettingStartedGuide } from "@/components/getting-started/getting-started-guide";
import { PageShell } from "@/components/layout/page-shell";

export const dynamic = "force-dynamic";

export default async function GettingStartedPage() {
  const t = await getTranslations("gettingStarted");

  return (
    <PageShell>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToWorkspace")}
      </Link>
      <GettingStartedGuide />
    </PageShell>
  );
}
