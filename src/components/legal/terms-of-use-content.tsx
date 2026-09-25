import { getTranslations } from "next-intl/server";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";
import {
  NOTORIA_CONTACT_EMAIL,
  NOTORIA_CONTACT_MAILTO,
} from "@/lib/contact";

/**
 * Terms of Use grounded in current Notoria product behaviour.
 *
 * Implementation notes for maintainers:
 * - Do not hard-code a euro price here. Checkout uses the server plan config
 *   (STRIPE_PRO_PRICE_ID / STRIPE_PREMIUM_PRICE_ID).
 * - Paid access = ADMIN, or plan pro/premium with status active|trialing|past_due
 *   (see src/lib/billing/plans.ts). past_due still keeps paid features.
 * - Free includes core practice and a daily AI allowance. Writing AI, PDF/DOCX,
 *   and generated listening practice stay on Pro. Premium adds the learning coach.
 * - Stripe portal enables invoice history, payment-method update, and cancel only;
 *   cancel mode (period-end vs immediate) is not configured in app code.
 * - Account deletion cancels the Stripe subscription immediately (best effort).
 * - No in-app refund engine exists.
 * - No registered company name/address is published in this repo.
 */

const TOC_IDS = [
  "agreement",
  "service",
  "accounts",
  "content",
  "acceptable-use",
  "ip",
  "ai",
  "plans",
  "billing",
  "refunds",
  "availability",
  "termination",
  "liability",
  "changes",
  "law",
  "contact",
] as const;

function siteLink(chunks: React.ReactNode) {
  return <a href="https://www.notoria.fi">{chunks}</a>;
}

function contactLink() {
  return (
    <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>
  );
}

export async function TermsOfUseContent() {
  const t = await getTranslations("legal.termsOfUse");

  const accountsList = t.raw("sections.accounts.list") as string[];
  const acceptableUseList = t.raw("sections.acceptableUse.list") as string[];

  return (
    <article className={mx(styles, "legal-prose")}>
      <p className={mx(styles, "legal-note")}>
        {t.rich("intro", { site: siteLink })}
      </p>

      <nav className={mx(styles, "legal-toc")} aria-label={t("tocAria")}>
        <p className={mx(styles, "legal-toc-title")}>{t("tocTitle")}</p>
        <ol className={mx(styles, "legal-toc-list")}>
          {TOC_IDS.map((id) => (
            <li key={id}>
              <a href={`#${id}`}>{t(`toc.${id}`)}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="agreement">
        <h2>{t("sections.agreement.title")}</h2>
        <p>
          {t.rich("sections.agreement.p1", {
            privacy: (chunks) => <a href="/privacy">{chunks}</a>,
          })}
        </p>
        <p>
          {t.rich("sections.agreement.p2", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="service">
        <h2>{t("sections.service.title")}</h2>
        <p>{t("sections.service.p1")}</p>
        <p>
          {t.rich("sections.service.p2", {
            account: (chunks) => <a href="/account">{chunks}</a>,
          })}
        </p>
        <p>{t("sections.service.p3")}</p>
      </section>

      <section id="accounts">
        <h2>{t("sections.accounts.title")}</h2>
        <ul>
          {accountsList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          {t.rich("sections.accounts.p1", {
            contact: () => contactLink(),
          })}
        </p>
        <p>
          {t.rich("sections.accounts.p2", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="content">
        <h2>{t("sections.content.title")}</h2>
        <p>{t("sections.content.p1")}</p>
        <p>{t("sections.content.p2")}</p>
        <p>{t("sections.content.p3")}</p>
      </section>

      <section id="acceptable-use">
        <h2>{t("sections.acceptableUse.title")}</h2>
        <p>{t("sections.acceptableUse.p1")}</p>
        <ul>
          {acceptableUseList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="ip">
        <h2>{t("sections.ip.title")}</h2>
        <p>{t("sections.ip.p1")}</p>
        <p>{t("sections.ip.p2")}</p>
      </section>

      <section id="ai">
        <h2>{t("sections.ai.title")}</h2>
        <p>{t("sections.ai.p1")}</p>
        <p>
          {t.rich("sections.ai.p2", {
            settings: (chunks) => <a href="/settings">{chunks}</a>,
          })}
        </p>
        <p>{t("sections.ai.p3")}</p>
      </section>

      <section id="plans">
        <h2>{t("sections.plans.title")}</h2>
        <p>{t("sections.plans.p1")}</p>
        <p>{t("sections.plans.p2")}</p>
        <p>{t("sections.plans.p3")}</p>
        <p>{t("sections.plans.p4")}</p>
      </section>

      <section id="billing">
        <h2>{t("sections.billing.title")}</h2>
        <ul>
          <li>
            {t.rich("sections.billing.list0", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </li>
          <li>
            {t.rich("sections.billing.list1", {
              account: (chunks) => <a href="/account">{chunks}</a>,
            })}
          </li>
          <li>{t("sections.billing.list2")}</li>
          <li>{t("sections.billing.list3")}</li>
        </ul>
        <p>
          {t.rich("sections.billing.p1", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </p>
        <p>
          {t.rich("sections.billing.p2", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </p>
        <p>{t("sections.billing.p3")}</p>
      </section>

      <section id="refunds">
        <h2>{t("sections.refunds.title")}</h2>
        <p>{t("sections.refunds.p1")}</p>
        <p>
          {t.rich("sections.refunds.p2", {
            contact: () => contactLink(),
          })}
        </p>
        <p>{t("sections.refunds.p3")}</p>
      </section>

      <section id="availability">
        <h2>{t("sections.availability.title")}</h2>
        <p>{t("sections.availability.p1")}</p>
      </section>

      <section id="termination">
        <h2>{t("sections.termination.title")}</h2>
        <p>
          {t.rich("sections.termination.p1", {
            account: (chunks) => <a href="/account">{chunks}</a>,
            privacy: (chunks) => <a href="/privacy">{chunks}</a>,
          })}
        </p>
        <p>{t("sections.termination.p2")}</p>
      </section>

      <section id="liability">
        <h2>{t("sections.liability.title")}</h2>
        <p>{t("sections.liability.p1")}</p>
        <p>{t("sections.liability.p2")}</p>
        <p>{t("sections.liability.p3")}</p>
      </section>

      <section id="changes">
        <h2>{t("sections.changes.title")}</h2>
        <p>{t("sections.changes.p1")}</p>
        <p>{t("sections.changes.p2")}</p>
      </section>

      <section id="law">
        <h2>{t("sections.law.title")}</h2>
        <p>{t("sections.law.p1")}</p>
        <p>{t("sections.law.p2")}</p>
        <p>
          {t.rich("sections.law.p3", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="contact">
        <h2>{t("sections.contact.title")}</h2>
        <p>
          {t.rich("sections.contact.p1", {
            contact: () => contactLink(),
          })}
        </p>
        <p>{t.rich("sections.contact.p2", { site: siteLink })}</p>
        <p>
          {t.rich("sections.contact.p3", {
            contactPage: (chunks) => <a href="/contact">{chunks}</a>,
            support: (chunks) => <a href="/support">{chunks}</a>,
          })}
        </p>
      </section>
    </article>
  );
}
