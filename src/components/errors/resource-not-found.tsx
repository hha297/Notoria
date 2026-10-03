import { ErrorPageFrame } from "@/components/errors/error-page-frame";
import type { ErrorResource } from "@/lib/errors";

export function ResourceNotFoundPage({ resource }: { resource: ErrorResource }) {
  return <ErrorPageFrame kind="resourceNotFound" resource={resource} />;
}
