import { Resend } from "resend";
import { NOTORIA_TECHNICAL_EMAIL } from "@/lib/contact";
import { ResendConfigError, isResendConfigured } from "@/lib/email/password-reset";

export type FeedbackType = "bug" | "feature" | "general";

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  general: "General Feedback",
};

export function feedbackTypeLabel(type: FeedbackType) {
  return TYPE_LABELS[type];
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new ResendConfigError();
  }
  return new Resend(apiKey);
}

function getFromEmail() {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    throw new ResendConfigError();
  }
  return from;
}

export type FeedbackAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type SendFeedbackEmailInput = {
  type: FeedbackType;
  message: string;
  userEmail: string;
  authenticated: boolean;
  userId?: string;
  pagePath?: string;
  userAgent?: string;
  attachments?: FeedbackAttachment[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendFeedbackEmail(input: SendFeedbackEmailInput) {
  if (!isResendConfigured()) {
    throw new ResendConfigError();
  }

  const typeLabel = feedbackTypeLabel(input.type);
  const subject = `[Notoria Feedback] ${typeLabel}`;
  const sentAt = new Date().toISOString();
  const attachmentCount = input.attachments?.length ?? 0;

  const textLines = [
    `Type: ${typeLabel}`,
    `From: ${input.userEmail}`,
    `Authenticated: ${input.authenticated ? "yes" : "no"}`,
    input.userId ? `Account id: ${input.userId}` : null,
    input.pagePath ? `Page: ${input.pagePath}` : null,
    input.userAgent ? `User-Agent: ${input.userAgent}` : null,
    attachmentCount > 0 ? `Attachments: ${attachmentCount}` : null,
    `Sent at: ${sentAt}`,
    "",
    "Message:",
    input.message,
  ].filter((line): line is string => line !== null);

  const html = buildFeedbackEmailHtml({
    typeLabel,
    userEmail: input.userEmail,
    authenticated: input.authenticated,
    userId: input.userId,
    pagePath: input.pagePath,
    userAgent: input.userAgent,
    attachmentCount,
    message: input.message,
    sentAt,
  });

  const resend = getResendClient();
  const from = getFromEmail();

  const result = await resend.emails.send({
    from,
    // Inbox for in-app feedback — not shown in the Support UI.
    to: NOTORIA_TECHNICAL_EMAIL,
    replyTo: input.userEmail,
    subject,
    html,
    text: textLines.join("\n"),
    attachments: input.attachments?.map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType,
    })),
  });

  if (result.error) {
    throw new Error("EMAIL_SEND_FAILED");
  }

  return result.data;
}

function buildFeedbackEmailHtml(input: {
  typeLabel: string;
  userEmail: string;
  authenticated: boolean;
  userId?: string;
  pagePath?: string;
  userAgent?: string;
  attachmentCount: number;
  message: string;
  sentAt: string;
}) {
  const brand = "#f7a501";
  const ink = "#23251d";
  const muted = "#5e6a72";
  const messageHtml = escapeHtml(input.message).replaceAll("\n", "<br />");

  const metaRows: Array<[string, string]> = [
    ["Type", input.typeLabel],
    ["From", input.userEmail],
    ["Authenticated", input.authenticated ? "yes" : "no"],
  ];
  if (input.userId) metaRows.push(["Account id", input.userId]);
  if (input.pagePath) metaRows.push(["Page", input.pagePath]);
  if (input.userAgent) metaRows.push(["User-Agent", input.userAgent]);
  if (input.attachmentCount > 0) {
    metaRows.push(["Attachments", String(input.attachmentCount)]);
  }
  metaRows.push(["Sent at", input.sentAt]);

  const metaHtml = metaRows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:4px 0;font-size:13px;color:${muted};width:120px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:4px 0;font-size:13px;color:${ink};word-break:break-word;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.typeLabel)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f1;font-family:IBM Plex Sans,Helvetica,Arial,sans-serif;color:${ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e6eaed;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.03em;">
                  Noto<span style="color:${brand};">ria</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;">
                <h1 style="margin:0;font-size:20px;line-height:1.3;font-weight:700;">${escapeHtml(input.typeLabel)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${metaHtml}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 28px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.08em;">Message</p>
                <div style="padding:14px 16px;border-radius:12px;background:#f7f8f5;border:1px solid #e6eaed;font-size:15px;line-height:1.55;color:${ink};">
                  ${messageHtml}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
