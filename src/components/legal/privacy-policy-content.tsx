import { getTranslations } from "next-intl/server";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";
import {
  NOTORIA_CONTACT_EMAIL,
  NOTORIA_CONTACT_MAILTO,
  NOTORIA_TECHNICAL_EMAIL,
  NOTORIA_TECHNICAL_MAILTO,
} from "@/lib/contact";

/**
 * Privacy Policy content grounded in the current Notoria implementation.
 *
 * Implementation notes for maintainers (do not invent claims in the UI copy):
 * - No registered company name/postal address is published in this repo; §1 tells
 *   users to request formal controller identity via contact@notoria.fi.
 * - Account deletion destroys avatar + listening Cloudinary assets and cascades DB
 *   rows; it does not currently purge exercise-import/editor Cloudinary assets or
 *   Stream call artefacts (stated carefully below).
 * - Feedback is emailed to NOTORIA_TECHNICAL_EMAIL, not contact@.
 * - Speaking calls create with transcription auto-on and recording mode disabled;
 *   recordingUrl is only stored if a recording-ready webhook later arrives.
 * - No in-product “policy changed” notice or automated policy-update email exists.
 * - Exact infrastructure backup retention is not configured in application code.
 */

const TOC_IDS = [
  "controller",
  "scope",
  "data",
  "purposes",
  "auth",
  "ai",
  "payments",
  "processors",
  "cookies",
  "transfers",
  "retention",
  "deletion",
  "rights",
  "children",
  "changes",
  "contact",
] as const;

type StringRow = { purpose: string; basis: string };
type ProviderRow = { provider: string; role: string };
type CookieRow = { cookie: string; purpose: string; code: boolean };

function siteLink(chunks: React.ReactNode) {
  return <a href="https://www.notoria.fi">{chunks}</a>;
}

function contactLink(chunks?: React.ReactNode) {
  return (
    <a href={NOTORIA_CONTACT_MAILTO}>
      {chunks && String(chunks).trim() ? chunks : NOTORIA_CONTACT_EMAIL}
    </a>
  );
}

function technicalLink() {
  return (
    <a href={NOTORIA_TECHNICAL_MAILTO}>{NOTORIA_TECHNICAL_EMAIL}</a>
  );
}

export async function PrivacyPolicyContent() {
  const t = await getTranslations("legal.privacyPolicy");

  const scopeList = t.raw("sections.scope.list") as string[];
  const accountAuthList = t.raw("sections.data.accountAuth.list") as string[];
  const subscriptionList = t.raw("sections.data.subscription.list") as string[];
  const purposeRows = t.raw("sections.purposes.rows") as StringRow[];
  const processorRows = t.raw("sections.processors.rows") as ProviderRow[];
  const cookieRows = t.raw("sections.cookies.rows") as CookieRow[];
  const retentionList = t.raw("sections.retention.list") as string[];
  const deleteList = t.raw("sections.deletion.deleteList") as string[];
  const rightsList = t.raw("sections.rights.list") as string[];

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

      <section id="controller">
        <h2>{t("sections.controller.title")}</h2>
        <p>{t.rich("sections.controller.p1", { site: siteLink })}</p>
        <p>
          {t.rich("sections.controller.p2", {
            contact: () => contactLink(),
          })}
        </p>
        <p>
          {t.rich("sections.controller.p3", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="scope">
        <h2>{t("sections.scope.title")}</h2>
        <p>{t("sections.scope.p1")}</p>
        <ul>
          {scopeList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t("sections.scope.p2")}</p>
      </section>

      <section id="data">
        <h2>{t("sections.data.title")}</h2>
        <p>{t("sections.data.p1")}</p>

        <h3>{t("sections.data.accountAuth.title")}</h3>
        <ul>
          {accountAuthList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h3>{t("sections.data.learningContent.title")}</h3>
        <p>{t("sections.data.learningContent.p1")}</p>
        <p>{t("sections.data.learningContent.p2")}</p>

        <h3>{t("sections.data.subscription.title")}</h3>
        <ul>
          {subscriptionList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t("sections.data.subscription.p1")}</p>

        <h3>{t("sections.data.device.title")}</h3>
        <p>
          {t.rich("sections.data.device.p1", {
            cookies: (chunks) => <a href="#cookies">{chunks}</a>,
          })}
        </p>

        <h3>{t("sections.data.support.title")}</h3>
        <ul>
          <li>
            {t.rich("sections.data.support.list0", {
              contact: () => contactLink(),
            })}
          </li>
          <li>{t("sections.data.support.list1")}</li>
        </ul>
        <p>
          {t.rich("sections.data.support.p1", {
            technical: () => technicalLink(),
          })}
        </p>
      </section>

      <section id="purposes">
        <h2>{t("sections.purposes.title")}</h2>
        <div className={mx(styles, "legal-table-wrap")}>
          <table className={mx(styles, "legal-table")}>
            <thead>
              <tr>
                <th scope="col">{t("sections.purposes.headers.purpose")}</th>
                <th scope="col">{t("sections.purposes.headers.basis")}</th>
              </tr>
            </thead>
            <tbody>
              {purposeRows.map((row) => (
                <tr key={row.purpose}>
                  <td>{row.purpose}</td>
                  <td>{row.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {t.rich("sections.purposes.p1", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="auth">
        <h2>{t("sections.auth.title")}</h2>
        <p>{t("sections.auth.p1")}</p>
        <p>{t("sections.auth.p2")}</p>
      </section>

      <section id="ai">
        <h2>{t("sections.ai.title")}</h2>
        <p>
          {t.rich("sections.ai.p1", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <p>
          {t.rich("sections.ai.p2", {
            settings: (chunks) => <a href="/settings">{chunks}</a>,
          })}
        </p>
        <p>{t("sections.ai.p3")}</p>
        <p>{t("sections.ai.p4")}</p>
      </section>

      <section id="payments">
        <h2>{t("sections.payments.title")}</h2>
        <p>
          {t.rich("sections.payments.p1", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <p>{t("sections.payments.p2")}</p>
      </section>

      <section id="processors">
        <h2>{t("sections.processors.title")}</h2>
        <p>{t("sections.processors.p1")}</p>
        <div className={mx(styles, "legal-table-wrap")}>
          <table className={mx(styles, "legal-table")}>
            <thead>
              <tr>
                <th scope="col">{t("sections.processors.headers.provider")}</th>
                <th scope="col">{t("sections.processors.headers.role")}</th>
              </tr>
            </thead>
            <tbody>
              {processorRows.map((row) => (
                <tr key={row.provider}>
                  <td>{row.provider}</td>
                  <td>{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>{t("sections.processors.p2")}</p>
      </section>

      <section id="cookies">
        <h2>{t("sections.cookies.title")}</h2>
        <p>{t("sections.cookies.p1")}</p>

        <h3>{t("sections.cookies.cookiesTitle")}</h3>
        <div className={mx(styles, "legal-table-wrap")}>
          <table className={mx(styles, "legal-table")}>
            <thead>
              <tr>
                <th scope="col">{t("sections.cookies.headers.cookie")}</th>
                <th scope="col">{t("sections.cookies.headers.purpose")}</th>
              </tr>
            </thead>
            <tbody>
              {cookieRows.map((row) => (
                <tr key={row.cookie}>
                  <td>{row.code ? <code>{row.cookie}</code> : row.cookie}</td>
                  <td>{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>{t("sections.cookies.storageTitle")}</h3>
        <p>{t("sections.cookies.p2")}</p>
        <p>{t("sections.cookies.p3")}</p>
      </section>

      <section id="transfers">
        <h2>{t("sections.transfers.title")}</h2>
        <p>{t("sections.transfers.p1")}</p>
        <p>
          {t.rich("sections.transfers.p2", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="retention">
        <h2>{t("sections.retention.title")}</h2>
        <ul>
          {retentionList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t("sections.retention.p1")}</p>
      </section>

      <section id="deletion">
        <h2>{t("sections.deletion.title")}</h2>

        <h3>{t("sections.deletion.exportTitle")}</h3>
        <p>
          {t.rich("sections.deletion.exportP1", {
            account: (chunks) => <a href="/account">{chunks}</a>,
          })}
        </p>
        <p>{t("sections.deletion.exportP2")}</p>

        <h3>{t("sections.deletion.deleteTitle")}</h3>
        <p>
          {t.rich("sections.deletion.deleteP1", {
            account: (chunks) => <a href="/account">{chunks}</a>,
          })}
        </p>
        <ul>
          {deleteList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t("sections.deletion.deleteP2")}</p>
        <p>
          {t.rich("sections.deletion.deleteP3", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="rights">
        <h2>{t("sections.rights.title")}</h2>
        <p>{t("sections.rights.p1")}</p>
        <ul>
          {rightsList.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>
            {t.rich("sections.rights.listComplaint", {
              ombudsman: (chunks) => (
                <a href="https://tietosuoja.fi">{chunks}</a>
              ),
            })}
          </li>
        </ul>
        <p>
          {t.rich("sections.rights.p2", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="children">
        <h2>{t("sections.children.title")}</h2>
        <p>
          {t.rich("sections.children.p1", {
            contact: () => contactLink(),
          })}
        </p>
      </section>

      <section id="changes">
        <h2>{t("sections.changes.title")}</h2>
        <p>{t("sections.changes.p1")}</p>
        <p>{t("sections.changes.p2")}</p>
      </section>

      <section id="contact">
        <h2>{t("sections.contact.title")}</h2>
        <p>
          {t.rich("sections.contact.p1", {
            contact: () => contactLink(),
          })}
        </p>
        <p>
          {t.rich("sections.contact.p2", {
            contactPage: (chunks) => <a href="/contact">{chunks}</a>,
            technical: () => technicalLink(),
          })}
        </p>
        <p>{t.rich("sections.contact.p3", { site: siteLink })}</p>
      </section>
    </article>
  );
}
