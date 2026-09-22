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

const TOC = [
  { id: "controller", label: "Who is responsible" },
  { id: "scope", label: "What this policy covers" },
  { id: "data", label: "Data we process" },
  { id: "purposes", label: "Why we process data" },
  { id: "auth", label: "Accounts and sign-in" },
  { id: "ai", label: "AI features" },
  { id: "payments", label: "Payments (Notoria Pro)" },
  { id: "processors", label: "Service providers" },
  { id: "cookies", label: "Cookies and device storage" },
  { id: "transfers", label: "International transfers" },
  { id: "retention", label: "How long we keep data" },
  { id: "deletion", label: "Export and account deletion" },
  { id: "rights", label: "Your rights (GDPR)" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
] as const;

export function PrivacyPolicyContent() {
  return (
    <article className={mx(styles, "legal-prose")}>
      <p className={mx(styles, "legal-note")}>
        This Privacy Policy explains how Notoria (
        <a href="https://www.notoria.fi">www.notoria.fi</a>) handles personal
        data for its private language-learning web app. It is written to match
        how the product works today. If a practice is not described here, we do
        not claim to do it.
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

      <section id="controller">
        <h2>1. Who is responsible</h2>
        <p>
          Notoria is the language-learning service at{" "}
          <a href="https://www.notoria.fi">www.notoria.fi</a>, offered to users
          in Finland and the wider EU/EEA.
        </p>
        <p>
          For privacy questions, data-subject requests, and other user contact,
          email{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>.
        </p>
        <p>
          {/* Controller identity is not published in the product codebase. */}A
          registered company name and postal address for the data controller are
          not published in the current product. If you need formal controller
          identification for a GDPR request, email{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a> and we
          will provide it.
        </p>
      </section>

      <section id="scope">
        <h2>2. What this policy covers</h2>
        <p>It covers personal data and learning content processed when you:</p>
        <ul>
          <li>create or use an account</li>
          <li>save material in private workspaces</li>
          <li>subscribe to Notoria Pro</li>
          <li>use optional AI-assisted tools</li>
          <li>upload media for listening or profile use</li>
          <li>use speaking practice</li>
          <li>send feedback or contact us</li>
        </ul>
        <p>
          The current application code does not include a third-party marketing
          analytics or advertising SDK. We do not claim to use trackers that are
          not present in the product.
        </p>
      </section>

      <section id="data">
        <h2>3. Data we process</h2>
        <p>
          Notoria processes different kinds of data for different reasons. The
          main categories are:
        </p>

        <h3>Account and authentication</h3>
        <ul>
          <li>Name and email address</li>
          <li>
            Password hash for email/password accounts (passwords are never stored
            in plain text)
          </li>
          <li>
            Google account identifiers and OAuth tokens if you sign in with
            Google
          </li>
          <li>Optional profile photo (avatar)</li>
          <li>Account role and created/updated timestamps</li>
        </ul>

        <h3>Learning content you create</h3>
        <p>
          Content you add in private workspaces, such as vocabulary, theory
          notes, writing documents, exercises and imported practice material,
          listening lessons (including media references and transcripts),
          speaking session transcripts and related session fields, folders, tags,
          and study progress such as flashcard reviews.
        </p>
        <p>
          This is your learning material. Notoria stores it so you can return to
          it and practise from it.
        </p>

        <h3>Subscription and payment metadata</h3>
        <ul>
          <li>Plan (free or Pro) and subscription status</li>
          <li>
            Stripe customer and subscription identifiers, and current period end
            when applicable
          </li>
        </ul>
        <p>
          Card numbers and payment-method secrets stay with Stripe. Notoria keeps
          only the billing metadata needed to reflect your Pro status.
        </p>

        <h3>Device and preference data</h3>
        <p>
          Cookies and browser storage used for sign-in, locale, active workspace,
          AI assistance preferences, theme, and similar product settings. See{" "}
          <a href="#cookies">Cookies and device storage</a>.
        </p>

        <h3>Support and feedback</h3>
        <ul>
          <li>
            Emails you send to{" "}
            <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>
          </li>
          <li>
            In-app feedback from Support (message, feedback type, your email,
            whether you are signed in, optional account id, page path,
            user-agent, and up to three optional image attachments)
          </li>
        </ul>
        <p>
          Feedback is delivered by email to Notoria’s technical inbox (
          <a href={NOTORIA_TECHNICAL_MAILTO}>{NOTORIA_TECHNICAL_EMAIL}</a>
          ). It is not stored as a separate ticket database inside Notoria.
        </p>
      </section>

      <section id="purposes">
        <h2>4. Why we process data</h2>
        <div className={mx(styles, "legal-table-wrap")}>
          <table className={mx(styles, "legal-table")}>
            <thead>
              <tr>
                <th scope="col">Purpose</th>
                <th scope="col">Typical GDPR basis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Provide accounts, workspaces, and your saved learning material</td>
                <td>Contract (Art. 6(1)(b))</td>
              </tr>
              <tr>
                <td>Authenticate you (email/password or Google) and reset passwords</td>
                <td>Contract (Art. 6(1)(b))</td>
              </tr>
              <tr>
                <td>Run Notoria Pro billing and subscription status via Stripe</td>
                <td>Contract (Art. 6(1)(b))</td>
              </tr>
              <tr>
                <td>
                  Optional AI help, listening transcription, and speaking
                  practice when you use those features
                </td>
                <td>Contract (Art. 6(1)(b)); preference controls where available</td>
              </tr>
              <tr>
                <td>Keep the service secure and reliable (abuse prevention, debugging)</td>
                <td>Legitimate interests (Art. 6(1)(f))</td>
              </tr>
              <tr>
                <td>Respond to support and feedback messages</td>
                <td>Legitimate interests / contract, depending on the request</td>
              </tr>
              <tr>
                <td>Comply with legal obligations</td>
                <td>Legal obligation (Art. 6(1)(c))</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          If you need a formal legal-basis note for a specific activity, email{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section id="auth">
        <h2>5. Accounts and sign-in</h2>
        <p>
          Notoria uses Auth.js (NextAuth) with a JWT session. You can sign in
          with email and password, or with Google OAuth when Google sign-in is
          configured.
        </p>
        <p>
          Password-reset emails are sent only for accounts that have a password.
          Reset tokens are stored hashed, expire after 30 minutes, and are used
          only to set a new password.
        </p>
      </section>

      <section id="ai">
        <h2>6. AI features</h2>
        <p>
          Optional AI features in the current product use <strong>OpenAI</strong>
          . Depending on the tool you use, Notoria may send relevant learning
          content — for example vocabulary items, writing text or selections,
          exercise or theory context, listening transcripts, speaking
          transcripts, or live audio for the speaking tutor.
        </p>
        <p>
          AI assistance preferences (including whether assistance is enabled)
          are stored in a browser cookie so the product can respect your
          settings. Many server actions that call the model check that
          assistance is enabled first. Turning assistance off in{" "}
          <a href="/settings">Settings</a> blocks AI tools that require it.
        </p>
        <p>
          Listening transcription via AssemblyAI can still run when you use
          Listening features that need a transcript, because transcription is
          part of that media workflow rather than the optional “AI assistance”
          preference alone.
        </p>
        <p>
          The current codebase does not use other large-language-model providers
          besides OpenAI. OpenAI processes data under its own terms and privacy
          policy as a processor for these features.
        </p>
      </section>

      <section id="payments">
        <h2>7. Payments (Notoria Pro)</h2>
        <p>
          Paid subscriptions are handled by <strong>Stripe</strong>. Checkout,
          invoices, payment methods, and cancellation run through Stripe Checkout
          and the Stripe Customer Portal. Stripe webhooks update your plan and
          status in Notoria.
        </p>
        <p>
          Stripe processes payment data as a payment provider. See Stripe’s own
          privacy documentation for card handling.
        </p>
      </section>

      <section id="processors">
        <h2>8. Service providers</h2>
        <p>
          Depending on which features you use, personal data or learning content
          may be processed by:
        </p>
        <div className={mx(styles, "legal-table-wrap")}>
          <table className={mx(styles, "legal-table")}>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Role in Notoria</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PostgreSQL database (production documented as Neon)</td>
                <td>Account and learning data</td>
              </tr>
              <tr>
                <td>Vercel</td>
                <td>
                  Application hosting (configured region includes Frankfurt /
                  fra1)
                </td>
              </tr>
              <tr>
                <td>Cloudinary</td>
                <td>
                  Avatars, listening media, editor images, and exercise-import
                  files
                </td>
              </tr>
              <tr>
                <td>AssemblyAI</td>
                <td>Transcription of listening audio</td>
              </tr>
              <tr>
                <td>Stream Video</td>
                <td>
                  Live speaking calls; automatic transcription; session fields
                  such as transcript URLs (and recording URLs only if a recording
                  event is later received)
                </td>
              </tr>
              <tr>
                <td>OpenAI</td>
                <td>Optional AI assistance and speaking-tutor realtime audio</td>
              </tr>
              <tr>
                <td>Resend</td>
                <td>Password-reset email and Support feedback delivery</td>
              </tr>
              <tr>
                <td>Stripe</td>
                <td>Notoria Pro checkout, portal, and subscription status</td>
              </tr>
              <tr>
                <td>Google</td>
                <td>
                  OAuth sign-in when you choose Google; web fonts for the UI
                </td>
              </tr>
              <tr>
                <td>Dicebear</td>
                <td>
                  Generated avatar images used in speaking sessions (from a name
                  seed; no account password is sent)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Speaking calls are created with transcription enabled. Recording is
          disabled at call creation in the current implementation; a recording
          URL is stored only if the product later receives a recording-ready
          event from Stream.
        </p>
      </section>

      <section id="cookies">
        <h2>9. Cookies and device storage</h2>
        <p>
          Notoria uses cookies and similar storage for necessary product
          functions. There is no separate Cookie Policy because the current
          implementation does not include advertising or analytics cookie
          programmes that would require one.
        </p>

        <h3>Cookies used by the app</h3>
        <div className={mx(styles, "legal-table-wrap")}>
          <table className={mx(styles, "legal-table")}>
            <thead>
              <tr>
                <th scope="col">Cookie</th>
                <th scope="col">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Auth.js session cookie</td>
                <td>Keeps you signed in (JWT session; library default naming)</td>
              </tr>
              <tr>
                <td>
                  <code>notoria-locale</code>
                </td>
                <td>UI language</td>
              </tr>
              <tr>
                <td>
                  <code>notoria-workspace</code>
                </td>
                <td>Active workspace</td>
              </tr>
              <tr>
                <td>
                  <code>notoria-ai-preferences</code>
                </td>
                <td>AI assistance preferences</td>
              </tr>
              <tr>
                <td>
                  <code>sidebar_state</code>
                </td>
                <td>Sidebar open/closed preference</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Local and session storage</h3>
        <p>
          Your browser may also store theme preference (via next-themes),
          onboarding/tutorial flags, keyboard and motion preferences, view-mode
          choices, temporary exercise or flashcard session state, and similar
          client-only settings.
        </p>
        <p>
          Clearing local preferences in Settings removes those device
          preferences. It does not delete your account or workspace content on
          the server.
        </p>
      </section>

      <section id="transfers">
        <h2>10. International transfers</h2>
        <p>
          Some providers above are based outside the EEA (for example in the
          United States) or may process data in more than one region. Where
          personal data leaves the EEA/UK, transfers rely on the safeguards those
          providers offer under applicable law — such as Standard Contractual
          Clauses where they apply — and on their published privacy terms.
        </p>
        <p>
          Application hosting for Notoria is configured toward the Frankfurt
          region (fra1). Ask{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a> if you
          need help finding the relevant provider documentation for a specific
          feature.
        </p>
      </section>

      <section id="retention">
        <h2>11. How long we keep data</h2>
        <ul>
          <li>
            Account and learning data are kept while your account remains open so
            you can use the service
          </li>
          <li>Password-reset tokens expire after 30 minutes</li>
          <li>
            Subscription metadata is kept as needed to reflect your current Pro
            status and Stripe billing relationship
          </li>
          <li>
            Support and feedback emails are retained as long as needed to handle
            your request and related follow-up
          </li>
        </ul>
        <p>
          {/* Exact backup retention is not hard-coded in application config. */}
          Exact backup retention windows for infrastructure providers are not
          hard-coded in the application and may follow those providers’
          operational practices. Contact us if you need clarification for a
          deletion request.
        </p>
      </section>

      <section id="deletion">
        <h2>12. Export and account deletion</h2>

        <h3>Export</h3>
        <p>
          From <a href="/account">Account</a> you can download a JSON backup of
          workspaces and learning content (including vocabulary, theory notes,
          exercises/writing, listening lessons, and speaking sessions). Media
          files are referenced by URL rather than embedded as binary files.
        </p>
        <p>
          The current export does not include every account-related record. For
          example, flashcard progress/reviews and exercise-import source records
          are not part of the JSON backup. OAuth tokens, password hashes, and
          Stripe identifiers are not exported.
        </p>

        <h3>Delete account</h3>
        <p>
          You can permanently delete your account from{" "}
          <a href="/account">Account</a>. When deletion succeeds, Notoria:
        </p>
        <ul>
          <li>
            deletes your user record and cascaded learning data from Notoria’s
            database
          </li>
          <li>
            cancels and removes related Stripe customer data where Stripe is
            configured (best effort)
          </li>
          <li>
            destroys avatar media and listening-lesson media that the deletion
            flow is implemented to remove from Cloudinary
          </li>
        </ul>
        <p>
          The current deletion flow does not claim to purge every third-party
          artefact automatically. In particular, some Cloudinary assets (such as
          editor images or exercise-import files) and Stream speaking-call
          artefacts may remain subject to those providers until cleaned up
          separately or purged under their own schedules.
        </p>
        <p>
          After deletion, limited residual copies may also remain briefly in
          encrypted backups or logs until those systems rotate. If something
          specific remains after you delete your account, email{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section id="rights">
        <h2>13. Your rights (GDPR)</h2>
        <p>
          If you are in the EU/EEA or otherwise protected by GDPR, you may have
          the right to:
        </p>
        <ul>
          <li>access your personal data</li>
          <li>correct inaccurate data</li>
          <li>erase data (including by deleting your account)</li>
          <li>restrict or object to certain processing</li>
          <li>receive a portable copy of data you provided (see Export above)</li>
          <li>withdraw consent where processing is based on consent</li>
          <li>
            lodge a complaint with a supervisory authority — in Finland, the
            Office of the Data Protection Ombudsman (
            <a href="https://tietosuoja.fi">tietosuoja.fi</a>)
          </li>
        </ul>
        <p>
          To exercise these rights, email{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>. We may
          need to verify that the request comes from the account holder.
        </p>
      </section>

      <section id="children">
        <h2>14. Children</h2>
        <p>
          Notoria requires an account and is built as a personal learning
          workspace. The product does not implement a dedicated age-gate. It is
          not directed at children. If you believe a child’s data has been
          submitted without appropriate authority, contact{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section id="changes">
        <h2>15. Changes</h2>
        <p>
          We may update this Privacy Policy when the product or legal
          requirements change. The “Last updated” date at the top of the page
          changes when a revision is published.
        </p>
        <p>
          {/* No automated policy-change email/notice is implemented today. */}
          When a change is material, we will communicate it in a reasonable way
          available at the time — for example by updating this page and, where
          appropriate, an in-product notice or email.
        </p>
      </section>

      <section id="contact">
        <h2>16. Contact</h2>
        <p>
          Privacy and general contact:{" "}
          <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>
        </p>
        <p>
          Product feedback technical inbox (also listed on{" "}
          <a href="/contact">Contact Us</a>):{" "}
          <a href={NOTORIA_TECHNICAL_MAILTO}>{NOTORIA_TECHNICAL_EMAIL}</a>
        </p>
        <p>
          Website: <a href="https://www.notoria.fi">www.notoria.fi</a>
        </p>
      </section>
    </article>
  );
}
