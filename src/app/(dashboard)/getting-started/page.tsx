import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GettingStartedGuide } from "@/components/getting-started/getting-started-guide";
import { PageShell } from "@/components/layout/page-shell";
import guideStyles from "@/components/style/guide/guide.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

export default async function GettingStartedPage() {
  const t = await getTranslations("gettingStarted");

  return (
    <PageShell className="writing-atelier-shell guide-atelier-shell">
      <div
        className={cn(
          "guide-atelier",
          mx(
            guideStyles,
            "writing-atelier guide-atelier flex flex-col gap-8 lg:gap-10",
          ),
        )}
      >
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToWorkspace")}
        </Link>
        <GettingStartedGuide />
      </div>
    </PageShell>
  );
}
