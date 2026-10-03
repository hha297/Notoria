"use client";

import { useEffect } from "react";
import { ErrorPageFrame } from "@/components/errors/error-page-frame";
import { logTechnicalError } from "@/lib/errors";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    logTechnicalError("app.error", error, { digest: error.digest });
  }, [error]);

  return (
    <ErrorPageFrame
      error={error}
      referenceId={error.digest}
      onReset={reset}
    />
  );
}
