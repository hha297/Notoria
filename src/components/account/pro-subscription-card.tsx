"use client";

import styles from "@/components/style/account/account.module.css";
import { mx } from "@/lib/css-module";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { planMonthlyPrice, QUOTA_FEATURES } from "@/lib/billing/plans";
import {
  accountBillingActions,
  isBillingExpect,
  subscriptionChangeConfirmed,
} from "@/lib/stripe/lifecycle";
import {
  billingErrorKey,
  createPortalSession,
  syncSubscription,
} from "@/lib/stripe/client-billing";

import type { BillingState } from "@/lib/stripe/types";

type ProSubscriptionCardProps = {
  billing: BillingState;
  checkoutResult?: string;
  expectPlan?: string;
};

export function ProSubscriptionCard({
  billing,
  checkoutResult,
  expectPlan,
}: ProSubscriptionCardProps) {
  const t = useTranslations("billing");
  const tAccount = useTranslations("account.pro");
  const router = useRouter();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(checkoutResult === "confirming");

  useEffect(() => {
    if (checkoutResult === "canceled") {
      toast.message(t("checkoutCanceled"));
      router.replace("/account");
      return;
    }

    if (checkoutResult !== "confirming" || !isBillingExpect(expectPlan)) {
      return;
    }

    const expect = expectPlan;
    let stopped = false;

    async function confirmChange() {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const synced = await syncSubscription();
        if (stopped) return;
        if (
          synced.ok &&
          synced.plan &&
          subscriptionChangeConfirmed(expect, {
            plan: synced.plan,
            cancelAtPeriodEnd: Boolean(synced.cancelAtPeriodEnd),
          })
        ) {
          const syncedLabel = synced.plan === "premium" ? t("premiumBadge") : t("proBadge");
          toast.success(
            expect === "premium"
              ? t("nowOnPremium")
              : expect === "pro"
                ? t("nowOnPro")
                : expect === "cancel"
                  ? t("switchScheduled")
                  : t("keptPlan", { plan: syncedLabel }),
          );
          router.replace("/account");
          router.refresh();
          setIsRefreshing(false);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      if (stopped) return;
      toast.message(t("stillConfirming"));
      router.replace("/account");
      router.refresh();
      setIsRefreshing(false);
    }

    void confirmChange();
    return () => {
      stopped = true;
    };
  }, [checkoutResult, expectPlan, router, t]);

  function openPortal() {
    if (portalPending) return;
    setPortalPending(true);
    void createPortalSession()
      .then((result) => {
        if (!result.ok || !result.url) {
          toast.error(t(billingErrorKey(result.code)));
          setPortalPending(false);
          return;
        }
        window.location.assign(result.url);
      })
      .catch(() => {
        toast.error(t("portalFailed"));
        setPortalPending(false);
      });
  }

  const periodEnd = billing.currentPeriodEnd
    ? format(new Date(billing.currentPeriodEnd), "d MMM yyyy")
    : null;
  const periodLabel = periodEnd ?? t("periodEndFallback");

  const planLabel =
    billing.plan === "premium"
      ? t("premiumBadge")
      : billing.plan === "pro"
        ? t("proBadge")
        : t("freeBadge");
  const lede = billing.cancelAtPeriodEnd
    ? t("accessUntil", { plan: planLabel, date: periodLabel })
    : billing.plan === "premium"
      ? tAccount("premiumLede")
      : billing.plan === "pro"
        ? tAccount("activeLede")
        : tAccount("freeLede");
  const actions = accountBillingActions({
    plan: billing.plan,
    cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
    hasStripeCustomer: billing.hasStripeCustomer,
  });

  return (
    <>
      <section className={mx(styles, "account-panel account-panel-pro")}>
        <header className={mx(styles, "account-panel-head")}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={mx(styles, "account-panel-title")}>{t("title")}</h2>
            <Badge variant={billing.plan === "free" ? "outline" : "pro"}>
              {planLabel}
            </Badge>
          </div>
          <p className={mx(styles, "account-panel-lede")}>{lede}</p>
        </header>

        <div className={mx(styles, "account-panel-body account-pro-body")}>
          <div className={mx(styles, "account-pro-row")}>
            <div className="space-y-1">
              <p className={mx(styles, "account-pro-price")}>
                {billing.plan === "free"
                  ? t("freePrice")
                  : t("monthlyPrice", { price: planMonthlyPrice(billing.plan) })}
              </p>
              {billing.cancelAtPeriodEnd ? (
                <>
                  <p className="text-sm font-medium">{t("cancellationScheduled")}</p>
                  <p className="text-sm text-muted-foreground">{t("thenFree")}</p>
                </>
              ) : billing.plan !== "free" && periodEnd ? (
                <p className="text-sm text-muted-foreground">
                  {t("renewsOn", { date: periodEnd })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {billing.status ? t("status", { status: billing.status }) : t("tagline")}
                </p>
              )}
              {isRefreshing ? (
                <p className="text-sm text-muted-foreground">
                  {expectPlan === "pro" || expectPlan === "premium"
                    ? t("confirming")
                    : t("confirmingChange")}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {actions.includes("upgrade") ? (
                <Button type="button" onClick={() => setUpgradeOpen(true)}>
                  <Sparkles className="size-4" />
                  {t("upgrade")}
                </Button>
              ) : null}
              {actions.includes("changePlan") ? (
                <Button type="button" onClick={() => setUpgradeOpen(true)}>
                  {t("changePlan")}
                </Button>
              ) : null}
              {actions.includes("keep") ? (
                <Button
                  type="button"
                  onClick={() => {
                    setResumeOpen(true);
                    setUpgradeOpen(true);
                  }}
                >
                  {billing.plan === "premium" ? t("keepPremium") : t("keepPro")}
                </Button>
              ) : null}
              {actions.includes("manageBilling") ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={portalPending}
                  onClick={openPortal}
                >
                  {portalPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("manageBilling")}
                </Button>
              ) : null}
              {actions.includes("openCoach") ? (
                <Button type="button" variant="outline" render={<Link href="/coach" />}>
                  {t("openCoach")}
                </Button>
              ) : null}
            </div>
          </div>

          {billing.plan === "free" ? (
            <div className={mx(styles, "account-pro-features")}>
              <p className={mx(styles, "account-pro-features-label")}>
                {t("usageToday")}
              </p>
              <ul className={mx(styles, "account-pro-feature-list")}>
                {QUOTA_FEATURES.map((feature) => {
                  const quota = billing.quotas.find((item) => item.feature === feature);
                  const used = quota?.used ?? 0;
                  const limit = quota?.limit ?? 0;
                  return (
                    <li key={feature} className={mx(styles, "account-pro-feature")}>
                      <span className={mx(styles, "account-pro-feature-mark")} aria-hidden>
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                      <div>
                        <p className={mx(styles, "account-pro-feature-title")}>
                          {t(`quotaLabels.${feature}`)}
                        </p>
                        <p className={mx(styles, "account-pro-feature-impact")}>
                          {t("quotaCount", { used, limit })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className={mx(styles, "account-pro-fineprint")}>{t("cancelAnytime")}</p>
            </div>
          ) : (
            <div className={mx(styles, "account-pro-features")}>
              <p className={mx(styles, "account-pro-features-label")}>
                {billing.plan === "premium"
                  ? tAccount("premiumIncluded")
                  : t("unlimitedAi")}
              </p>
              <ul className={mx(styles, "account-pro-feature-list")}>
                {(billing.plan === "premium"
                  ? (["coach", "profile", "daily", "weekly", "mistakes"] as const)
                  : (["unlimited", "listening", "speaking", "writing", "export"] as const)
                ).map((id) => (
                  <li key={id} className={mx(styles, "account-pro-feature")}>
                    <span className={mx(styles, "account-pro-feature-mark")} aria-hidden>
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                    <p className={mx(styles, "account-pro-feature-title")}>
                      {t(`points.${id}`)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
      <ProUpgradeDialog
        open={upgradeOpen}
        openOnResume={resumeOpen}
        onOpenChange={(next) => {
          setUpgradeOpen(next);
          if (!next) setResumeOpen(false);
        }}
        variant="upgrade"
      />
    </>
  );
}
