import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={mx(styles, "legal-layout")}>{children}</div>;
}
