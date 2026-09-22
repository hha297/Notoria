import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";

type PublicPageShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export async function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: PublicPageShellProps) {
  const t = await getTranslations("legal");
  const session = await auth();
  const homeHref = session?.user ? "/" : "/sign-in";

  return (
    <div className={mx(styles, "legal-shell")}>
      <div className={mx(styles, "legal-inner")}>
        <header className={mx(styles, "legal-hero")}>
          <Link
            href={homeHref}
            className={mx(styles, "legal-brand-link")}
            aria-label="Notoria"
          >
            <Logo size="md" />
            <LogoWordmark
              tone="ink"
              className={mx(styles, "legal-brand-wordmark")}
            />
          </Link>

          <p className={mx(styles, "legal-kicker")}>{eyebrow}</p>
          <h1 className={mx(styles, "legal-title")}>{title}</h1>
          {description ? (
            <p className={mx(styles, "legal-meta")}>{description}</p>
          ) : null}
        </header>

        <section className={mx(styles, "legal-panel")} aria-label={title}>
          <div className={mx(styles, "legal-panel-body")}>{children}</div>
        </section>

        <p className={mx(styles, "legal-footer")}>
          <Link href={homeHref} className={mx(styles, "legal-back-link")}>
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            {session?.user ? t("backHome") : t("backToSignIn")}
          </Link>
        </p>
      </div>

      <div className={mx(styles, "legal-site-footer")}>
        <SiteFooter variant="public" />
      </div>
    </div>
  );
}
