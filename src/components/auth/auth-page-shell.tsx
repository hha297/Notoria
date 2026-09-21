import Link from "next/link";
import { Logo, LogoWordmark } from "@/components/ui/logo";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
}: AuthPageShellProps) {
  return (
    <div className="auth-atelier-shell">
      <div className="auth-atelier">
        <header className="auth-hero">
          <Link
            href="/sign-in"
            className="auth-brand-link"
            aria-label="Notoria"
          >
            <Logo size="md" />
            <LogoWordmark tone="ink" className="auth-brand-wordmark" />
          </Link>

          <div className="auth-hero-copy">
            <p className="auth-kicker">{eyebrow}</p>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-lede">{description}</p>
          </div>
        </header>

        <section className="auth-panel" aria-label={title}>
          <div className="auth-panel-body">{children}</div>
        </section>
      </div>
    </div>
  );
}
