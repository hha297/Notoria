/** Single general contact for Notoria (support, billing, privacy, feedback). */
export const NOTORIA_CONTACT_EMAIL = "contact@notoria.fi";
export const NOTORIA_CONTACT_MAILTO = `mailto:${NOTORIA_CONTACT_EMAIL}`;

/** Display formatting only — use NOTORIA_CONTACT_TEL for tel: links. */
export const NOTORIA_CONTACT_PHONE_DISPLAY = "+358 46 652 2707";
export const NOTORIA_CONTACT_TEL = "tel:+358466522707";

export function feedbackMailto(kind: "bug" | "feature" | "feedback") {
  const subjects = {
    bug: "Bug report",
    feature: "Feature request",
    feedback: "Feedback",
  } as const;
  const params = new URLSearchParams({
    subject: `Notoria — ${subjects[kind]}`,
  });
  return `${NOTORIA_CONTACT_MAILTO}?${params.toString()}`;
}
