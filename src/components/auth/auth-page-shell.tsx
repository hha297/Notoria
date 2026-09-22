import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export async function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
}: AuthPageShellProps) {
  return (
    <div className={mx(styles, "auth-atelier-shell auth-atelier-shell-footer")}>
      <div className={mx(styles, "auth-atelier")}>
        <header className={mx(styles, "auth-hero")}>
          <Link
            href="/sign-in"
            className={mx(styles, "auth-brand-link")}
            aria-label="Notoria"
          >
            <Logo size="md" />
            <LogoWordmark
              tone="ink"
              className={mx(styles, "auth-brand-wordmark")}
            />
          </Link>

          <div className={mx(styles, "auth-hero-copy")}>
            <p className={mx(styles, "auth-kicker")}>{eyebrow}</p>
            <h1 className={mx(styles, "auth-title")}>{title}</h1>
            <p className={mx(styles, "auth-lede")}>{description}</p>
          </div>
        </header>

        <section className={mx(styles, "auth-panel")} aria-label={title}>
          <div className={mx(styles, "auth-panel-body")}>{children}</div>
        </section>
      </div>

      <div className={mx(styles, "auth-site-footer")}>
        <SiteFooter variant="public" />
      </div>
    </div>
  );
}
