import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={mx(styles, "auth-layout")}>{children}</div>;
}
