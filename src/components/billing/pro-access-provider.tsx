"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";

type ProAccessContextValue = {
  hasProAccess: boolean;
  openUpgrade: () => void;
};

const ProAccessContext = createContext<ProAccessContextValue | null>(null);

export function ProAccessProvider({
  hasProAccess,
  children,
}: {
  hasProAccess: boolean;
  children: ReactNode;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const value = useMemo(
    () => ({
      hasProAccess,
      openUpgrade: () => setUpgradeOpen(true),
    }),
    [hasProAccess],
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
      openUpgrade: () => {},
    };
  }
  return context;
}
