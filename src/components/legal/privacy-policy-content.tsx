import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";

/**
 * Privacy Policy content grounded in the current Notoria implementation.
 * Do not add processors, cookies, retention rules, or legal-entity details
 * that are not supported by the codebase or the product contact details provided.
 */
export function PrivacyPolicyContent() {
  return (
    <article className={mx(styles, "legal-prose")}>
      <p className={mx(styles, "legal-note")}>
        This Privacy Policy describes how Notoria (available at{" "}
        <a href="https://www.notoria.fi">www.notoria.fi</a>) handles personal
        data for the private language-learning web app. It reflects how the
        product works today. If something is not listed here, we do not claim to
        do it.
      </p>

      <section>
        <h2>1. Who is responsible</h2>
        <p>
          Notoria is the language-learning service operated at{" "}
          <a href="https://www.notoria.fi">www.notoria.fi</a>, aimed at users in
          Finland and the wider EU.
        </p>
        <p>
          For privacy questions, data-subject requests, and all other
          user-facing contact, email{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>.
        </p>
        <p>
          A registered company name and postal address for the data controller
          are not published inside the current product codebase. If you need
          formal controller identification for a GDPR request, contact{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a> and we will
          provide it.
        </p>
      </section>

      <section>
        <h2>2. What this policy covers</h2>
        <p>
          It covers personal data and learning content processed when you create
          an account, use workspaces, subscribe to Notoria Pro, use AI-assisted
          features, upload media, or contact us.
        </p>
        <p>
          Notoria does not run a separate marketing site analytics stack in the
          current application code. We do not claim to use advertising trackers
          or third-party analytics SDKs that are not present in the product.
        </p>
      </section>

      <section>
        <h2>3. Personal data we collect</h2>

        <h3>Account and authentication</h3>
        <ul>
          <li>Name and email address</li>
          <li>
            Password hash for email/password accounts (passwords are never stored
            in plain text)
          </li>
          <li>Google account ID and OAuth tokens if you use Google sign-in</li>
          <li>Optional profile photo (avatar)</li>
          <li>Account role and created/updated timestamps</li>
        </ul>

        <h3>Learning and workspace content</h3>
        <p>
          Content you create in private workspaces: vocabulary, writing,
          theory notes, exercises and imports, listening lessons (media and
          transcripts), speaking sessions (transcripts, summaries, media URLs),
          folders, tags, and study progress such as flashcard reviews.
        </p>

        <h3>Subscription and billing metadata</h3>
        <ul>
          <li>Plan (free or Pro) and subscription status</li>
          <li>
            Stripe customer/subscription IDs and current period end when
            applicable
          </li>
        </ul>
        <p>
          Card details stay with Stripe. Notoria only keeps billing metadata
          needed to sync your Pro status.
        </p>

        <h3>Technical and preference data on your device</h3>
        <p>
          Cookies and browser storage used for sign-in, locale, active
          workspace, AI assistance preferences, theme, and similar product
          settings. Details are in section 9.
        </p>

        <h3>Support communications</h3>
        <p>
          If you email <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>
          , we process the content of that correspondence to respond.
        </p>
      </section>

      <section>
        <h2>4. Why we process data</h2>
        <ul>
          <li>
            <strong>Provide the service</strong> — accounts, private workspaces,
            and the learning material you save
          </li>
          <li>
            <strong>Authenticate you</strong> — email/password or Google, plus
            password reset when needed
          </li>
          <li>
            <strong>Run Pro features</strong> — Stripe checkout, renewal status,
            and customer portal access
          </li>
          <li>
            <strong>Optional AI help</strong> — only when AI assistance is on and
            you use an AI tool
          </li>
          <li>
            <strong>Listening and speaking media</strong> — uploads, transcripts,
            live tutor calls, and session results you can revisit
          </li>
          <li>
            <strong>Security and reliability</strong> — prevent abuse, debug
            issues, and keep the service working
          </li>
          <li>
            <strong>Comply with law</strong> — lawful requests and required
            records
          </li>
        </ul>
        <p>
          Under GDPR these purposes usually rest on contract performance,
          legitimate interests in running a secure service, and — where required —
          consent or another valid basis. For a formal legal-basis breakdown of a
          specific activity, email{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>.
        </p>
      </section>

      <section>
        <h2>5. Authentication</h2>
        <p>
          Notoria uses Auth.js (NextAuth) with a JWT session. You can sign in
          with email and password or with Google OAuth when Google sign-in is
          configured.
        </p>
        <p>
          Password reset emails are sent only for accounts that have a password.
          Reset tokens are stored hashed, expire after 30 minutes, and are used
          only to set a new password.
        </p>
      </section>

      <section>
        <h2>6. AI processing</h2>
        <p>
          AI features are powered by <strong>OpenAI</strong> in the current
          implementation. Depending on the feature, Notoria may send relevant
          learning content such as vocabulary items, writing text or selections,
          exercise context, listening transcripts, speaking transcripts, or live
          audio for the speaking tutor.
        </p>
        <p>
          AI assistance preferences (including whether assistance is enabled)
          are stored in a browser cookie so the product can respect your
          settings. Server actions that require AI check that assistance is
          enabled before calling the model.
        </p>
        <p>
          Notoria does not claim to use other large-language-model providers in
          the current codebase. OpenAI processes data under its own terms and
          privacy policy as a processor/sub-processor for these features.
        </p>
      </section>

      <section>
        <h2>7. Email</h2>
        <p>
          Transactional email is sent with <strong>Resend</strong>. In the
          current product, the implemented email type is password-reset mail.
          We do not claim a broader marketing email programme based on the
          current code.
        </p>
      </section>

      <section>
        <h2>8. Payments and Notoria Pro</h2>
        <p>
          Paid subscriptions are handled by <strong>Stripe</strong>. Checkout,
          invoices, payment methods, and cancellation are managed through Stripe
          Checkout and the Stripe Customer Portal. Stripe webhooks update your
          plan and status in Notoria.
        </p>
        <p>
          Stripe processes payment data as an independent payment provider. See
          Stripe’s own privacy documentation for card handling details.
        </p>
      </section>

      <section>
        <h2>9. Cookies and local storage</h2>
        <p>
          Notoria uses cookies and similar storage for necessary product
          functions. There is no separate Cookie Policy because the current
          implementation does not include advertising or analytics cookie
          programmes that would require one.
        </p>

        <h3>Cookies used by the app</h3>
        <ul>
          <li>
            <strong>Auth.js session cookie</strong> — keeps you signed in (JWT
            session; library default cookie naming)
          </li>
          <li>
            <strong>notoria-locale</strong> — UI language
          </li>
          <li>
            <strong>notoria-workspace</strong> — active workspace
          </li>
          <li>
            <strong>notoria-ai-preferences</strong> — AI assistance preferences
          </li>
          <li>
            <strong>sidebar_state</strong> — sidebar open/closed preference
          </li>
        </ul>

        <h3>Local and session storage</h3>
        <p>
          The browser may also store theme preference (via next-themes),
          onboarding/tutorial flags, keyboard and motion preferences, view-mode
          choices, temporary exercise/flashcard session state, and similar
          client-only settings. Clearing local preferences in Settings removes
          those device preferences; it does not delete your account or
          workspace content on the server.
        </p>
      </section>

      <section>
        <h2>10. Media, hosting, and other processors</h2>
        <p>Depending on which features you use, data may be processed by:</p>
        <ul>
          <li>
            <strong>PostgreSQL database</strong> (production documented as Neon)
            — account and learning data
          </li>
          <li>
            <strong>Cloudinary</strong> — avatars, listening media, editor
            images, and exercise-import files
          </li>
          <li>
            <strong>AssemblyAI</strong> — transcription of listening audio
          </li>
          <li>
            <strong>Stream Video</strong> — live speaking calls and related
            recording/transcription events stored as session URLs
          </li>
          <li>
            <strong>Google</strong> — OAuth sign-in when you choose Google;
            web fonts loaded for the UI
          </li>
          <li>
            <strong>Vercel</strong> — application hosting (configured region
            includes Frankfurt / <code>fra1</code> in project config)
          </li>
          <li>
            <strong>OpenAI</strong>, <strong>Resend</strong>, and{" "}
            <strong>Stripe</strong> — as described above
          </li>
        </ul>
      </section>

      <section>
        <h2>11. International transfers</h2>
        <p>
          Some processors above are based outside the EEA (for example in the
          United States) or may process data in multiple regions. Where personal
          data leaves the EEA/UK, transfers rely on the safeguards those
          providers offer under applicable law (such as Standard Contractual
          Clauses) and their published privacy terms. Ask{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a> if you need
          help identifying the relevant processor documentation for a specific
          feature.
        </p>
      </section>

      <section>
        <h2>12. Retention</h2>
        <ul>
          <li>
            Account and learning data are kept while your account remains open
            so you can use the service
          </li>
          <li>Password-reset tokens expire after 30 minutes</li>
          <li>
            Subscription metadata is kept as needed to reflect your current Pro
            status and billing relationship with Stripe
          </li>
          <li>
            Support emails are retained as long as needed to handle your request
            and any related follow-up
          </li>
        </ul>
        <p>
          Exact backup retention windows for infrastructure providers are not
          hard-coded in the application and may follow those providers’ default
          operational practices. Contact us if you need clarification for a
          deletion request.
        </p>
      </section>

      <section>
        <h2>13. Deleting your data</h2>
        <p>
          You can permanently delete your account from Account settings. Deleting
          your account removes your user record and cascaded learning data from
          Notoria’s database, cancels and removes related Stripe customer data
          where Stripe is configured, and removes avatar and listening lesson
          media that the deletion flow is implemented to destroy.
        </p>
        <p>
          You can also export an account backup JSON from the deletion flow
          before confirming. Exported backups include references to media URLs
          rather than embedding every binary file.
        </p>
        <p>
          After deletion, limited residual copies may remain for a short time in
          encrypted backups, logs, or processor systems until those systems
          purge them under their own schedules. Some third-party media or call
          artefacts may also be governed by the relevant provider’s retention
          rules. If something specific remains after you delete your account,
          email <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>.
        </p>
      </section>

      <section>
        <h2>14. Your rights (GDPR)</h2>
        <p>If you are in the EU/EEA or otherwise protected by GDPR, you may have
          the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Erase data (including by deleting your account)</li>
          <li>Restrict or object to certain processing</li>
          <li>Receive a portable copy of data you provided</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>
            Lodge a complaint with a supervisory authority — in Finland, the
            Office of the Data Protection Ombudsman (
            <a href="https://tietosuoja.fi">tietosuoja.fi</a>)
          </li>
        </ul>
        <p>
          To exercise these rights, email{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>. We may need
          to verify that the request comes from the account holder.
        </p>
      </section>

      <section>
        <h2>15. Children</h2>
        <p>
          The product requires an account and is built as a personal learning
          workspace. The codebase does not implement a dedicated age-gate. If
          you believe a child’s data has been submitted without appropriate
          authority, contact{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>.
        </p>
      </section>

      <section>
        <h2>16. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy when the product or legal
          requirements change. The “Last updated” date at the top of the page
          will change when we publish a revision. Material changes that affect
          how we handle your data will be communicated in a reasonable way, such
          as an in-product notice or email when appropriate.
        </p>
      </section>

      <section>
        <h2>17. Contact</h2>
        <p>
          Privacy and general contact:{" "}
          <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>
        </p>
        <p>
          Website: <a href="https://www.notoria.fi">www.notoria.fi</a>
        </p>
      </section>
    </article>
  );
}
