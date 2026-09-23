"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { PlanId } from "@/lib/billing/plans";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";

type ProAccessContextValue = {
  hasProAccess: boolean;
  plan: PlanId;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  scheduledPlan: PlanId | null;
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
  children,
}: {
  hasProAccess: boolean;
  plan?: PlanId;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  scheduledPlan?: PlanId | null;
  children: ReactNode;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const value = useMemo(
    () => ({
      hasProAccess,
      plan,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      scheduledPlan,
      openUpgrade: () => setUpgradeOpen(true),
      openPremium: () => setUpgradeOpen(true),
    }),
    [hasProAccess, plan, cancelAtPeriodEnd, currentPeriodEnd, scheduledPlan],
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

export function useProAccess() {
  const context = useContext(ProAccessContext);
  if (!context) {
    return {
      hasProAccess: false,
      plan: "free" as PlanId,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      scheduledPlan: null,
      openUpgrade: () => {},
      openPremium: () => {},
    };
  }
  return context;
}
