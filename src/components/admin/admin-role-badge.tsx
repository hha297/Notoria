import type { UserRole } from "@/db/schema";
import styles from "@/components/style/admin/admin.module.css";
import { mx } from "@/lib/css-module";

const ROLE_CLASS: Record<UserRole, string> = {
  USER: "admin-role-user",
  TESTER: "admin-role-tester",
  ADMIN: "admin-role-admin",
};

type AdminRoleBadgeProps = {
  role: UserRole | string;
  label: string;
};

export function AdminRoleBadge({ role, label }: AdminRoleBadgeProps) {
  const tone =
    role === "ADMIN" || role === "TESTER" || role === "USER"
      ? ROLE_CLASS[role]
      : "admin-role-user";

  return (
    <span className={mx(styles, "admin-role-badge", tone)}>{label}</span>
  );
}
