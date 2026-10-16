"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlanId, QuotaStatus } from "@/lib/billing/plans";
import { getMyQuotaStatuses } from "@/lib/actions/billing-quotas";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";

type ProAccessContextValue = {
  hasProAccess: boolean;
  plan: PlanId;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  scheduledPlan: PlanId | null;
  introOfferEligible: boolean;
  quotas: QuotaStatus[];
  refreshQuotas: () => Promise<void>;
  openUpgrade: () => void;
  openPremium: () => void;
};

const ProAccessContext = createContext<ProAccessContextValue | null>(null);

export function ProAccessProvider({
  hasProAccess,
  plan = "free",
  cancelAtPeriodEnd = false,
  currentPeriodEnd = null,
  scheduledPlan = null,
  introOfferEligible = false,
  initialQuotas = [],
  children,
}: {
  hasProAccess: boolean;
  plan?: PlanId;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  scheduledPlan?: PlanId | null;
  introOfferEligible?: boolean;
  initialQuotas?: QuotaStatus[];
  children: ReactNode;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [quotas, setQuotas] = useState<QuotaStatus[]>(initialQuotas);

  useEffect(() => {
    setQuotas(initialQuotas);
  }, [initialQuotas]);

  const refreshQuotas = useCallback(async () => {
    try {
      const next = await getMyQuotaStatuses();
      setQuotas(next);
    } catch {
      // Keep last known snapshot; backend still enforces.
    }
  }, []);

  const value = useMemo(
    () => ({
      hasProAccess,
      plan,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      scheduledPlan,
      introOfferEligible,
      quotas,
      refreshQuotas,
      openUpgrade: () => setUpgradeOpen(true),
      openPremium: () => setUpgradeOpen(true),
    }),
    [
      hasProAccess,
      plan,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      scheduledPlan,
      introOfferEligible,
      quotas,
      refreshQuotas,
    ],
  );

  return (
    <ProAccessContext.Provider value={value}>
      {children}
      <ProUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        variant="locked"
      />
    </ProAccessContext.Provider>
  );
}

const EMPTY_QUOTAS: QuotaStatus[] = [];

export function useProAccess() {
  const context = useContext(ProAccessContext);
  if (!context) {
    return {
      hasProAccess: false,
      plan: "free" as PlanId,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      scheduledPlan: null,
      introOfferEligible: false,
      quotas: EMPTY_QUOTAS,
      refreshQuotas: async () => {},
      openUpgrade: () => {},
      openPremium: () => {},
    };
  }
  return context;
}
