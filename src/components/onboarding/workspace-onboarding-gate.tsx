"use client";

import { useEffect, useState, useTransition } from "react";
import { WorkspaceOnboarding } from "@/components/onboarding/workspace-onboarding";
import { getWorkspaceActivitySnapshotAction } from "@/lib/actions/onboarding";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";
import { shouldShowWorkspaceOnboarding } from "@/lib/onboarding/storage";

type WorkspaceOnboardingGateProps = {
  workspaceId: string | null;
};

/**
 * Avoids running onboarding count queries on every dashboard navigation.
 * Only fetches a snapshot after localStorage says the modal may appear.
 */
export function WorkspaceOnboardingGate({
  workspaceId,
}: WorkspaceOnboardingGateProps) {
  const [snapshot, setSnapshot] = useState<WorkspaceActivitySnapshot | null>(
    null,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!workspaceId || !shouldShowWorkspaceOnboarding(workspaceId)) {
      startTransition(() => setSnapshot(null));
      return;
    }

    let cancelled = false;
    void getWorkspaceActivitySnapshotAction(workspaceId).then((next) => {
      if (!cancelled) {
        startTransition(() => setSnapshot(next));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  if (!workspaceId || !snapshot) {
    return null;
  }

  return (
    <WorkspaceOnboarding workspaceId={workspaceId} snapshot={snapshot} />
  );
}
