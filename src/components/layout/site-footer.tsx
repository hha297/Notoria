import Link from "next/link";
import { getTranslations } from "next-intl/server";
import styles from "@/components/style/layout/footer.module.css";
import { mx } from "@/lib/css-module";
import {
  NOTORIA_CONTACT_EMAIL,
  NOTORIA_CONTACT_MAILTO,
  NOTORIA_CONTACT_PHONE_DISPLAY,
  NOTORIA_CONTACT_TEL,
} from "@/lib/contact";

const EXPLORE_LINKS = [
  { href: "/how-to-use", key: "howToUse" as const },
  { href: "/about", key: "about" as const },
  { href: "/our-story", key: "ourStory" as const },
];

const HELP_LINKS = [{ href: "/help", key: "helpSupport" as const }];

const LEGAL_LINKS = [
  { href: "/privacy", key: "privacy" as const },
  { href: "/terms", key: "terms" as const },
];

export async function SiteFooter({
  variant = "public",
}: {
  variant?: "public" | "app";
}) {
  const t = await getTranslations("footer");

  return (
    <footer className={mx(styles, "site-footer")} data-variant={variant}>
      <div className={mx(styles, "site-footer-inner")}>
        <nav
          className={mx(styles, "site-footer-grid")}
          aria-label={t("navLabel")}
        >
          <FooterGroup heading={t("explore")}>
            {EXPLORE_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={mx(styles, "site-footer-link")}>
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </FooterGroup>

          <FooterGroup heading={t("help")}>
            {HELP_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={mx(styles, "site-footer-link")}>
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </FooterGroup>

          <FooterGroup heading={t("legal")}>
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={mx(styles, "site-footer-link")}>
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </FooterGroup>

          <div className={mx(styles, "site-footer-group")}>
            <p className={mx(styles, "site-footer-heading")}>{t("contact")}</p>
            <div className={mx(styles, "site-footer-contact")}>
              <p className={mx(styles, "site-footer-contact-label")}>
                {t("emailLabel")}
              </p>
              <a
                href={NOTORIA_CONTACT_MAILTO}
                className={mx(styles, "site-footer-link")}
              >
                {NOTORIA_CONTACT_EMAIL}
              </a>
              <p className={mx(styles, "site-footer-contact-label")}>
                {t("phoneLabel")}
              </p>
              <a
                href={NOTORIA_CONTACT_TEL}
                className={mx(styles, "site-footer-link")}
              >
                {NOTORIA_CONTACT_PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </nav>

        <div className={mx(styles, "site-footer-bottom")}>
          <p className={mx(styles, "site-footer-copy")}>{t("copyright")}</p>
          <p className={mx(styles, "site-footer-tagline")}>{t("tagline")}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className={mx(styles, "site-footer-group")}>
      <p className={mx(styles, "site-footer-heading")}>{heading}</p>
      <ul className={mx(styles, "site-footer-list")}>{children}</ul>
    </div>
  );
}
