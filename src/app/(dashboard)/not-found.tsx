import { ErrorPageFrame } from "@/components/errors/error-page-frame";

/** Fallback for dashboard routes without a segment-specific not-found. */
export default function DashboardNotFound() {
  return <ErrorPageFrame kind="notFound" />;
}
