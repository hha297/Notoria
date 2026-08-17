"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  billingErrorKey,
  createPortalSession,
} from "@/lib/stripe/client-billing";
import type { BillingState } from "@/lib/stripe/types";

type ProSubscriptionCardProps = {
  billing: BillingState;
  checkoutResult?: string;
};

export function ProSubscriptionCard({
  billing,
  checkoutResult,
}: ProSubscriptionCardProps) {
  const t = useTranslations("billing");
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
      <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
        <CardHeader className="border-b border-hairline-cloud px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg text-ink">{t("title")}</CardTitle>
            <Badge variant={billing.isPro ? "secondary" : "outline"}>
              {billing.isPro ? t("proBadge") : t("freeBadge")}
            </Badge>
          </div>
          <CardDescription>
            {billing.isPro ? t("proDescription") : t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight text-ink">
              {t("price")}
            </p>
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
        </CardContent>
      </Card>
      <ProUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
