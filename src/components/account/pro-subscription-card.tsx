"use client";

import styles from "@/components/style/account/account.module.css";
import { mx } from "@/lib/css-module";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  billingErrorKey,
  createPortalSession,
} from "@/lib/stripe/client-billing";
import type { BillingState } from "@/lib/stripe/types";

const PRO_FEATURES = [
  "aiPractice",
  "writingAi",
  "export",
  "listening",
  "speaking",
] as const;

type ProFeatureId = (typeof PRO_FEATURES)[number];

type ProSubscriptionCardProps = {
  billing: BillingState;
  checkoutResult?: string;
};

export function ProSubscriptionCard({
  billing,
  checkoutResult,
}: ProSubscriptionCardProps) {
  const t = useTranslations("billing");
  const tAccount = useTranslations("account.pro");
  const router = useRouter();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [isPortalPending, startPortalTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(checkoutResult === "success");

  useEffect(() => {
    if (checkoutResult === "canceled") {
      toast.message(t("checkoutCanceled"));
      router.replace("/account");
      return;
    }

    if (checkoutResult !== "success") {
      return;
    }

    toast.success(t("checkoutSuccess"));
    router.replace("/account");
    router.refresh();

    const retries = [1200, 3000, 6000];
    const timers = retries.map((delay) =>
      window.setTimeout(() => {
        router.refresh();
      }, delay),
    );

    const done = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 6500);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
    };
  }, [checkoutResult, router, t]);

  async function openPortal() {
    startPortalTransition(async () => {
      try {
        const result = await createPortalSession();
        if (!result.ok || !result.url) {
          toast.error(t(billingErrorKey(result.code ?? "PORTAL_FAILED")));
          return;
        }
        window.location.assign(result.url);
      } catch {
        toast.error(t("portalFailed"));
      }
    });
  }

  const periodEnd = billing.currentPeriodEnd
    ? format(new Date(billing.currentPeriodEnd), "d MMM yyyy")
    : null;

  return (
    <>
      <section className={mx(styles, "account-panel account-panel-pro")}>
        <header className={mx(styles, "account-panel-head")}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={mx(styles, "account-panel-title")}>{t("title")}</h2>
            <Badge variant={billing.isPro ? "pro" : "outline"}>
              {billing.isPro ? t("proBadge") : t("freeBadge")}
            </Badge>
          </div>
          <p className={mx(styles, "account-panel-lede")}>
            {billing.isPro ? tAccount("activeLede") : tAccount("freeLede")}
          </p>
        </header>

        <div className={mx(styles, "account-panel-body account-pro-body")}>
          <div className={mx(styles, "account-pro-row")}>
            <div className="space-y-1">
              <p className={mx(styles, "account-pro-price")}>{t("price")}</p>
              {billing.isPro && periodEnd ? (
                <p className="text-sm text-muted-foreground">
                  {t("renewsOn", { date: periodEnd })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("tagline")}</p>
              )}
              {isRefreshing && !billing.isPro ? (
                <p className="text-sm text-muted-foreground">{t("activating")}</p>
              ) : null}
            </div>

            {billing.isPro ? (
              <Button
                type="button"
                variant="outline"
                className="route-quiet-action"
                disabled={isPortalPending || !billing.hasStripeCustomer}
                onClick={openPortal}
              >
                {isPortalPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {t("manage")}
              </Button>
            ) : (
              <Button type="button" onClick={() => setUpgradeOpen(true)}>
                <Sparkles className="size-4" />
                {t("upgrade")}
              </Button>
            )}
          </div>

          <div className={mx(styles, "account-pro-features")}>
            <p className={mx(styles, "account-pro-features-label")}>
              {billing.isPro
                ? tAccount("includedLabel")
                : tAccount("unlockLabel")}
            </p>
            <ul className={mx(styles, "account-pro-feature-list")}>
              {PRO_FEATURES.map((id) => (
                <ProFeatureRow key={id} id={id} />
              ))}
            </ul>
            {!billing.isPro ? (
              <p className={mx(styles, "account-pro-fineprint")}>{t("cancelAnytime")}</p>
            ) : null}
          </div>
        </div>
      </section>
      <ProUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}

function ProFeatureRow({ id }: { id: ProFeatureId }) {
  const tBilling = useTranslations("billing.compare.rows");
  const tAccount = useTranslations("account.pro.features");

  return (
    <li className={mx(styles, "account-pro-feature")}>
      <span className={mx(styles, "account-pro-feature-mark")} aria-hidden>
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
      <div>
        <p className={mx(styles, "account-pro-feature-title")}>
          {tBilling(`${id}.capability`)}
        </p>
        <p className={mx(styles, "account-pro-feature-impact")}>{tAccount(id)}</p>
      </div>
    </li>
  );
}
