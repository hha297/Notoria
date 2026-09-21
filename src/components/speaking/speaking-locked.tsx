"use client";

import { Lock, MessageCircle, Sparkles, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import styles from "@/components/style/speaking/session.module.css";
import { mx } from "@/lib/css-module";

export function SpeakingLockedPage() {
  const t = useTranslations("speaking");
  const tBilling = useTranslations("billing");
  const { openUpgrade } = useProAccess();

  const guide = [
    {
      icon: Sparkles,
      title: t("guide.pick.title"),
      body: t("guide.pick.body"),
    },
    {
      icon: Video,
      title: t("guide.call.title"),
      body: t("guide.call.body"),
    },
    {
      icon: MessageCircle,
      title: t("guide.review.title"),
      body: t("guide.review.body"),
    },
  ] as const;

  return (
    <PageShell className="writing-atelier-shell speaking-atelier-shell">
      <div className="writing-atelier speaking-atelier flex flex-col gap-10 lg:gap-12">
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">{t("title")}</h1>
            <p className="writing-brand-lede">{t("description")}</p>
          </div>
        </header>

        <section className={mx(styles, "speaking-guide")} aria-label={t("guide.aria")}>
          {guide.map((item, index) => (
            <article key={item.title} className={mx(styles, "speaking-guide-card")}>
              <div className={mx(styles, "speaking-guide-index")} aria-hidden="true">
                {index + 1}
              </div>
              <div className={mx(styles, "speaking-guide-icon")} aria-hidden="true">
                <item.icon className="size-4" />
              </div>
              <h2 className={mx(styles, "speaking-guide-title")}>{item.title}</h2>
              <p className={mx(styles, "speaking-guide-body")}>{item.body}</p>
            </article>
          ))}
        </section>

        <div className="writing-empty-desk">
          <div className="mb-4 flex size-12 items-center justify-center text-muted-foreground">
            <Lock className="size-6" />
          </div>
          <p className="writing-empty-title">{tBilling("lockedTitle")}</p>
          <p className="writing-brand-lede">{tBilling("lockedDescription")}</p>
          <Button className="mt-5 route-primary-cta" onClick={openUpgrade}>
            {tBilling("upgrade")}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
