import { PageShell } from "@/components/layout/page-shell";

export default function InboxLoading() {
  return (
    <PageShell>
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-72 max-w-full rounded bg-muted" />
        <div className="mt-8 space-y-3">
          <div className="h-24 rounded-lg bg-muted/70" />
          <div className="h-24 rounded-lg bg-muted/70" />
        </div>
      </div>
    </PageShell>
  );
}
