"use client";

import { useTransition } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  billingErrorKey,
  createCheckoutSession,
} from "@/lib/stripe/client-billing";

const BENEFITS = [
  "vocab",
  "writing",
  "exercises",
  "listening",
  "files",
  "personal",
] as const;

type ProUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "upgrade" | "locked";
};

export function ProUpgradeDialog({
  open,
  onOpenChange,
  variant = "upgrade",
}: ProUpgradeDialogProps) {
  const t = useTranslations("billing");
  const [isPending, startTransition] = useTransition();
  const isLocked = variant === "locked";

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    onOpenChange(next);
  }

  function handleUpgrade() {
    if (isPending) return;

    startTransition(async () => {
      try {
        const result = await createCheckoutSession();
        if (!result.ok || !result.url) {
          toast.error(t(billingErrorKey(result.code)));
          return;
        }
        window.location.assign(result.url);
      } catch {
        toast.error(t("checkoutFailed"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        className="gap-5 overflow-hidden p-6 sm:max-w-lg sm:p-8"
      >
        <DialogHeader className="items-center gap-2 text-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent-lime/20 text-accent-lime">
            <Sparkles className="size-4" />
          </div>
          <DialogTitle className="text-center text-lg text-ink">
            {isLocked ? t("lockedTitle") : t("modalTitle")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isLocked ? t("lockedDescription") : t("modalSubtitle")}
          </DialogDescription>
          {isLocked ? null : (
            <p className="pt-1 font-heading text-xl font-medium text-ink">
              {t("price")}
            </p>
          )}
        </DialogHeader>

        {isLocked ? null : (
          <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-accent-lime" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug text-ink">
                    {t(`benefits.${benefit}.title`)}
                  </p>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {t(`benefits.${benefit}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 pt-1">
          <Button
            type="button"
            className="w-full"
            disabled={isPending}
            onClick={handleUpgrade}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("upgrade")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("cancelAnytime")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
