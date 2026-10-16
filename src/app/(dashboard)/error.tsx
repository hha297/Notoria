"use client";

import { useEffect } from "react";
import { ErrorPageFrame } from "@/components/errors/error-page-frame";
import { logTechnicalError } from "@/lib/errors";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Dashboard segment errors — full-viewport takeover (hides studio chrome). */
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
