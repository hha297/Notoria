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
 * - Do not hard-code a euro price here. Checkout uses STRIPE_PRICE_ID; the Stripe
 *   Price object is the source of truth at purchase time.
 * - Pro access = ADMIN role OR plan pro with status active|trialing|past_due
 *   (see src/lib/auth/paid-access.ts). past_due still keeps Pro features.
 * - Some AI (e.g. vocabulary helpers, editor Format) is not Pro-gated; Listening,
 *   Speaking, exercise import, form-a-sentence, many AI study tools, and PDF/DOCX
 *   export are Pro-gated.
 * - Stripe portal enables invoice history, payment-method update, and cancel only;
 *   cancel mode (period-end vs immediate) is not configured in app code.
 * - Account deletion cancels the Stripe subscription immediately (best effort).
 * - No in-app refund engine exists.
 * - No registered company name/address is published in this repo.
 */

const TOC = [
  { id: "agreement", label: "Agreement" },
  { id: "service", label: "The service" },
  { id: "accounts", label: "Accounts" },
  { id: "content", label: "Your content" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "ip", label: "Intellectual property" },
  { id: "ai", label: "AI-generated output" },
  { id: "plans", label: "Free plan and Notoria Pro" },
  { id: "billing", label: "Subscription and billing" },
  { id: "refunds", label: "Refunds and consumer rights" },
  { id: "availability", label: "Availability" },
  { id: "termination", label: "Suspension and termination" },
  { id: "liability", label: "Disclaimer and liability" },
  { id: "changes", label: "Changes" },
  { id: "law", label: "Governing law" },
  { id: "contact", label: "Contact" },
] as const;

export function TermsOfUseContent() {
  return (
    <article className={mx(styles, "legal-prose")}>
      <p className={mx(styles, "legal-note")}>
        These Terms of Use explain the rules for using Notoria at{" "}
        <a href="https://www.notoria.fi">www.notoria.fi</a>. They describe how
        the product works today: private learning workspaces, optional Notoria
        Pro billing through Stripe, and AI-assisted features. They are not a
        substitute for advice from a lawyer about your specific situation.
      </p>

      <nav className={mx(styles, "legal-toc")} aria-label="On this page">
        <p className={mx(styles, "legal-toc-title")}>On this page</p>
        <ol className={mx(styles, "legal-toc-list")}>
          {TOC.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="agreement">
        <h2>1. Agreement</h2>
        <p>
          By creating an account or using Notoria, you agree to these Terms and
          to the <a href="/privacy">Privacy Policy</a>. If you do not agree, do
          not use the service.
        </p>
        <p>
          Questions about these Terms:{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section id="service">
        <h2>2. The service</h2>
        <p>
          Notoria is a private language-learning web app. You can create
          workspaces and keep learning material such as vocabulary, theory notes,
          writing, exercises, listening lessons, and speaking sessions.
        </p>
        <p>
          Some features are available on the free plan. Notoria Pro unlocks
          additional capabilities as shown in the product and on your{" "}
          <a href="/account">Account</a> page — including Listening, Speaking,
          certain AI study tools, exercise import, and paid document export
          formats. Feature availability can change as the product evolves.
        </p>
        <p>
          Notoria is for personal language learning. It is not a school, exam
          authority, or professional advice service.
        </p>
      </section>

      <section id="accounts">
        <h2>3. Accounts</h2>
        <ul>
          <li>Provide accurate account information</li>
          <li>Keep your password and account access secure</li>
          <li>
            Sign in with email and password, or with Google when Google sign-in
            is available
          </li>
          <li>
            Use Notoria only if you are able to enter into a binding agreement
            under applicable law
          </li>
        </ul>
        <p>
          The product does not implement a separate age-gate. If you believe an
          account was created without appropriate authority, contact{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>.
        </p>
        <p>
          Notify us at{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a> if you
          think your account has been compromised.
        </p>
      </section>

      <section id="content">
        <h2>4. Your content</h2>
        <p>
          You keep ownership of the learning content you create or upload in
          Notoria.
        </p>
        <p>
          You grant Notoria a limited licence to host, process, display, and back
          up that content so the service can function — including sending
          relevant material to AI, transcription, media, or payment providers
          when you use those features. That licence exists only to operate
          Notoria for you. It does not transfer ownership of your content to us.
        </p>
        <p>
          You are responsible for what you store. Do not upload material you do
          not have the right to use, and do not use Notoria to store unlawful
          content.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>break the law or infringe others’ rights</li>
          <li>attempt to access other users’ private workspaces or accounts</li>
          <li>
            probe, overload, or disrupt the service, APIs, or related
            infrastructure
          </li>
          <li>
            abuse AI, transcription, listening, or speaking features in ways that
            harm others or circumvent plan limits through fraud
          </li>
          <li>
            reverse engineer the service except where mandatory local law allows
          </li>
          <li>
            misrepresent your identity to Stripe, Google, or Notoria support
          </li>
        </ul>
      </section>

      <section id="ip">
        <h2>6. Intellectual property</h2>
        <p>
          Notoria’s name, branding, software, and product design are owned by
          Notoria or its licensors. These Terms do not transfer ownership of the
          product to you.
        </p>
        <p>
          Your learning content remains yours, subject to the limited licence in
          section 4.
        </p>
      </section>

      <section id="ai">
        <h2>7. AI-generated output</h2>
        <p>
          Some features can check, suggest, generate, transcribe, summarise, or
          tutor based on your material. Output may be incomplete, incorrect, or
          unsuitable for your goal. You remain responsible for reviewing AI
          results before relying on them for study, exams, professional use, or
          publication.
        </p>
        <p>
          AI features may be unavailable if assistance is turned off in{" "}
          <a href="/settings">Settings</a>, if your plan does not include a
          particular tool, or if a provider is temporarily unreachable.
        </p>
        <p>
          Not all AI helpers require Notoria Pro. The product shows which tools
          are free and which need Pro.
        </p>
      </section>

      <section id="plans">
        <h2>8. Free plan and Notoria Pro</h2>
        <p>
          The free plan covers core practice with your own vocabulary and related
          study tools as shown in the product.
        </p>
        <p>
          Notoria Pro is a paid subscription that unlocks additional features. In
          the current product, that typically includes Listening, Speaking,
          exercise import, form-a-sentence practice, many AI-assisted study
          tools, and PDF/DOCX document export. Some lighter AI helpers (such as
          certain vocabulary or editor formatting aids) may remain available on
          the free plan when AI assistance is enabled.
        </p>
        <p>
          Pro access is tied to your user account, so it applies across the
          workspaces under that account. Accounts with an administrator role may
          have Pro-level access without a personal Stripe subscription.
        </p>
        <p>
          {/* Price comes from Stripe Price (STRIPE_PRICE_ID), not app constants. */}
          The price that applies to your purchase is the price shown at Stripe
          Checkout for the current Pro plan. Any price shown elsewhere in the
          product (for example on Account) is indicative only and must match the
          active Stripe price configuration.
        </p>
      </section>

      <section id="billing">
        <h2>9. Subscription, billing, and cancellation</h2>
        <ul>
          <li>
            Pro subscriptions are billed through <strong>Stripe</strong>
          </li>
          <li>
            You can start checkout from <a href="/account">Account</a> or from
            locked Pro controls in the app
          </li>
          <li>
            From Account, you can open the Stripe Customer Portal to view
            invoices, update payment methods, and cancel the subscription
          </li>
          <li>
            Cancellation follows Stripe’s Customer Portal behaviour for your
            subscription
          </li>
        </ul>
        <p>
          After you cancel, Pro access continues only while your Stripe
          subscription status still grants Pro in the product. In the current
          implementation, statuses treated as Pro include{" "}
          <code>active</code>, <code>trialing</code>, and <code>past_due</code>.
          When the status no longer qualifies, the account returns to the free
          plan.
        </p>
        <p>
          If a payment fails, Stripe may move the subscription to{" "}
          <code>past_due</code> or another status. Notoria syncs that status from
          Stripe webhooks. While the status remains <code>past_due</code>, Pro
          features stay available under the current access rules; if the
          subscription later becomes cancelled or otherwise ineligible, Pro
          access ends.
        </p>
        <p>
          Deleting your Notoria account cancels the Stripe subscription
          immediately (best effort) as part of account deletion. That is
          different from cancelling renewal through the Customer Portal while
          keeping the account.
        </p>
      </section>

      <section id="refunds">
        <h2>10. Refunds and consumer rights</h2>
        <p>
          Notoria does not implement an automatic in-app refund button.
          Cancellation is available through the Stripe Customer Portal.
        </p>
        <p>
          If you want a refund review, or if EU/EEA consumer rules for digital
          content or distance contracts give you rights that apply to your
          purchase, email{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a> with your
          account email and Stripe receipt details. We will handle the request in
          line with applicable law and Stripe’s tools.
        </p>
        <p>
          Nothing in these Terms is intended to limit mandatory consumer rights
          that cannot be waived under Finnish or EU law.
        </p>
      </section>

      <section id="availability">
        <h2>11. Availability</h2>
        <p>
          We aim to keep Notoria available, but we do not promise uninterrupted
          or error-free service. Maintenance, provider outages, or changes to
          third-party AI, media, email, or payment services can affect features.
        </p>
      </section>

      <section id="termination">
        <h2>12. Suspension and termination</h2>
        <p>
          You may delete your account at any time from{" "}
          <a href="/account">Account</a>. Deletion permanently removes your
          account and associated learning data from Notoria’s database, subject
          to the details and residual-processor notes in the{" "}
          <a href="/privacy">Privacy Policy</a>. You can export a JSON backup
          from Account before you delete.
        </p>
        <p>
          We may suspend or terminate access if you seriously or repeatedly
          breach these Terms, misuse the service, or create security or legal
          risk. Where reasonable and lawful, we will try to notify you at the
          email on your account.
        </p>
      </section>

      <section id="liability">
        <h2>13. Disclaimer and liability</h2>
        <p>
          Notoria is provided on an “as available” basis for personal language
          learning. To the fullest extent permitted by applicable law, we
          disclaim warranties that are not required by law.
        </p>
        <p>
          To the fullest extent permitted by applicable law, Notoria is not
          liable for indirect, incidental, special, consequential, or lost-data
          damages arising from your use of the service or reliance on AI output.
          Where liability cannot be excluded, it is limited to the amount you
          paid for Notoria Pro in the three months before the claim, or any
          greater amount required by mandatory law.
        </p>
        <p>
          These limits do not exclude liability that Finnish or EU law does not
          allow to be limited — including liability that cannot be waived for
          consumers, and liability for death or personal injury caused by
          negligence where such rules apply.
        </p>
      </section>

      <section id="changes">
        <h2>14. Changes to the service and Terms</h2>
        <p>
          We may update features, plans, and these Terms. The “Last updated” date
          on this page changes when a new version is published.
        </p>
        <p>
          {/* No automated Terms-change email is implemented in the product today. */}
          If a change is material, we will provide reasonable notice when
          practical — for example by updating this page and, where appropriate,
          an in-product notice or email. Continued use after the effective date
          means you accept the updated Terms, except where mandatory law requires
          a different process.
        </p>
      </section>

      <section id="law">
        <h2>15. Governing law</h2>
        <p>
          These Terms are governed by the laws of Finland, without regard to
          conflict-of-law rules that would require another jurisdiction’s law.
        </p>
        <p>
          Courts in Finland have jurisdiction, without prejudice to mandatory
          consumer protections that allow you to bring proceedings in your
          country of residence inside the EU/EEA.
        </p>
        <p>
          {/* No company registry details are published in the product codebase. */}
          Formal operator identity beyond the Notoria service and contact email
          is not published in the current product. For contractual or regulatory
          correspondence, use{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section id="contact">
        <h2>16. Contact</h2>
        <p>
          Billing questions, Terms questions, and related legal notices:{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>
        </p>
        <p>
          Website: <a href="https://www.notoria.fi">www.notoria.fi</a>
        </p>
        <p>
          For general support options and the technical feedback inbox, see{" "}
          <a href="/contact">Contact Us</a> and <a href="/support">Support</a>.
        </p>
      </section>
    </article>
  );
}
