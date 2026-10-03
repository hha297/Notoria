"use client";

import { useEffect } from "react";
import { ErrorPageFrame } from "@/components/errors/error-page-frame";
import { logTechnicalError } from "@/lib/errors";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Dashboard segment errors — keeps studio chrome from the layout above. */
export default function DashboardErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    logTechnicalError("dashboard.error", error, { digest: error.digest });
  }, [error]);

  return (
    <ErrorPageFrame
      error={error}
      referenceId={error.digest}
      onReset={reset}
    />
  );
}
