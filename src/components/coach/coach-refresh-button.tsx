"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshLearningCoach } from "@/lib/actions/coach";

export function CoachRefreshButton() {
  const t = useTranslations("coach");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="route-quiet-action"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await refreshLearningCoach();
          if (!result.ok) {
            if (result.code === "RATE_LIMITED") {
              toast.error(t("refreshRateLimited"));
            } else if (result.code === "AI_BUSY") {
              toast.error(t("refreshBusy"));
            } else {
              toast.error(t("refreshFailed"));
            }
            return;
          }
          router.refresh();
          toast.success(t("refreshed"));
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="size-4" aria-hidden />
      )}
      {t("refresh")}
    </Button>
  );
}
