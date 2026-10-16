import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  AdminAccessError,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { AccountSuspendedError } from "@/lib/auth/errors";

export const preferredRegion = ["fra1"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    if (
      error instanceof AdminAccessError ||
      error instanceof AccountSuspendedError ||
      (error instanceof Error && error.message === "Unauthorized")
    ) {
      redirect("/");
    }
    throw error;
  }

  return <AdminShell>{children}</AdminShell>;
}
