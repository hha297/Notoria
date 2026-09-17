import { PageTransition } from "@/components/layout/page-transition";

/**
 * Remounts on every dashboard navigation so PageTransition can play a
 * short enter animation without blocking routing or data fetches.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
