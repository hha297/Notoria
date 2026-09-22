import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";

/**
 * Terms of Use grounded in the current Notoria product behaviour.
 * Avoid unsupported refund, SLA, or corporate-identity claims.
 */
export function TermsOfUseContent() {
  return (
    <article className={mx(styles, "legal-prose")}>
      <p className={mx(styles, "legal-note")}>
        These Terms of Use explain the rules for using Notoria at{" "}
        <a href="https://www.notoria.fi">www.notoria.fi</a>. They are written for
        real product behaviour: private learning workspaces, optional Notoria Pro
        billing through Stripe, and AI-assisted features. They are not a
        substitute for advice from a lawyer about your specific situation.
      </p>

      <section>
        <h2>1. Agreement</h2>
        <p>
          By creating an account or using Notoria, you agree to these Terms and
          to the <a href="/privacy">Privacy Policy</a>. If you do not agree, do
          not use the service.
        </p>
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>.
        </p>
      </section>

      <section>
        <h2>2. The service</h2>
        <p>
          Notoria is a private language-learning web app. You can create
          workspaces and keep learning material such as vocabulary, writing,
          theory notes, exercises, listening lessons, and speaking sessions.
        </p>
        <p>
          Some features are available on the free plan. Notoria Pro unlocks
          additional capabilities described in the product and on your Account
          page, including AI-assisted tools, Listening, Speaking, and certain
          export formats. Feature availability can change as the product evolves.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <ul>
          <li>You must provide accurate account information</li>
          <li>
            You are responsible for keeping your password and account access
            secure
          </li>
          <li>
            You may sign in with email/password or Google when Google sign-in is
            available
          </li>
          <li>
            You must be able to enter into a binding agreement under applicable
            law to use Notoria
          </li>
        </ul>
        <p>
          Notify us at{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a> if you
          believe your account has been compromised.
        </p>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          You keep ownership of the learning content you create or upload. You
          grant Notoria the permission needed to host, process, display, and
          back up that content so the service can function — including sending
          relevant snippets to AI, transcription, or media processors when you
          use those features.
        </p>
        <p>
          You are responsible for the content you store. Do not upload material
          you do not have the right to use, and do not use Notoria to store
          unlawful content.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Break the law or infringe others’ rights</li>
          <li>
            Attempt to access other users’ private workspaces or accounts
          </li>
          <li>
            Probe, overload, or disrupt the service, APIs, or related
            infrastructure
          </li>
          <li>
            Abuse AI, transcription, or speaking features in ways that harm
            others or circumvent plan limits through fraud
          </li>
          <li>
            Reverse engineer the service except where mandatory local law allows
          </li>
          <li>
            Misrepresent your identity to Stripe, Google, or Notoria support
          </li>
        </ul>
      </section>

      <section>
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

      <section>
        <h2>7. AI-generated output</h2>
        <p>
          AI features can check, suggest, generate, transcribe, summarise, or
          tutor based on your material. Output may be incomplete, incorrect, or
          unsuitable for your goal. You remain responsible for reviewing AI
          results before relying on them for study, exams, professional use, or
          publication.
        </p>
        <p>
          AI features may be unavailable if assistance is disabled in your
          preferences, if your plan does not include them, or if a provider is
          temporarily unreachable.
        </p>
      </section>

      <section>
        <h2>8. Free plan and Notoria Pro</h2>
        <p>
          The free plan covers core practice with your own vocabulary and related
          study tools as shown in the product. Notoria Pro is a paid subscription
          that unlocks additional features. Administrators may have Pro-level
          access without a personal Stripe subscription.
        </p>
        <p>
          Current public pricing in the product documentation is{" "}
          <strong>€9.99 per month</strong>. The price shown at checkout in Stripe
          is the price that applies to your purchase.
        </p>
      </section>

      <section>
        <h2>9. Subscription, billing, and cancellation</h2>
        <ul>
          <li>
            Pro subscriptions are billed through <strong>Stripe</strong>
          </li>
          <li>
            You can start checkout from Account or from locked Pro controls
          </li>
          <li>
            You can manage payment methods, view invoices, and cancel through the
            Stripe Customer Portal linked from Account
          </li>
          <li>
            Cancellation stops future renewals according to Stripe’s portal
            behaviour and your current billing period
          </li>
        </ul>
        <p>
          If a payment fails, Stripe and Notoria may update your subscription
          status (including past_due or cancelled states) based on webhook
          events. Access to Pro features follows the plan and status rules
          implemented in the product.
        </p>
      </section>

      <section>
        <h2>10. Refunds and consumer rights</h2>
        <p>
          The application does not implement an automatic in-app refund engine.
          Cancellation is available through the Stripe Customer Portal.
        </p>
        <p>
          If you want a refund review, or if EU/EEA consumer rules for digital
          content or distance contracts give you rights that apply to your
          purchase, contact{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a> with your
          account email and Stripe receipt details. We will handle the request in
          line with applicable law and the payment provider’s tools. Nothing in
          these Terms is intended to limit mandatory consumer rights that cannot
          be waived.
        </p>
      </section>

      <section>
        <h2>11. Availability</h2>
        <p>
          We aim to keep Notoria available, but we do not promise uninterrupted
          or error-free service. Maintenance, provider outages, or changes to
          third-party AI, media, email, or payment services can affect features.
        </p>
      </section>

      <section>
        <h2>12. Account suspension and termination</h2>
        <p>
          You may delete your account at any time from Account settings. Deletion
          permanently removes your account and associated learning data from
          Notoria’s database as described in the Privacy Policy.
        </p>
        <p>
          We may suspend or terminate access if you seriously or repeatedly
          breach these Terms, misuse the service, or create security or legal
          risk. Where reasonable and lawful, we will try to notify you at the
          email on your account.
        </p>
      </section>

      <section>
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
          paid for Notoria Pro in the three months before the claim, or a greater
          amount if mandatory law requires it.
        </p>
        <p>
          These limits do not exclude liability that Finnish or EU law does not
          allow to be limited, including liability for death or personal injury
          caused by negligence where such rules apply, or other non-excludable
          duties.
        </p>
      </section>

      <section>
        <h2>14. Changes to the service or Terms</h2>
        <p>
          We may update features, plans, and these Terms. The “Last updated” date
          on this page will change when a new version is published. If a change
          is material, we will provide reasonable notice when practical. Continued
          use after the effective date means you accept the updated Terms, except
          where mandatory law requires a different process.
        </p>
      </section>

      <section>
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
          Formal operator identity beyond the Notoria service and contact email
          is not published in the current product codebase. For contractual or
          regulatory correspondence, use{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>.
        </p>
      </section>

      <section>
        <h2>16. Contact</h2>
        <p>
          All user-facing issues, billing questions, and legal notices related to
          these Terms:{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>
        </p>
        <p>
          Website: <a href="https://www.notoria.fi">www.notoria.fi</a>
        </p>
      </section>
    </article>
  );
}
