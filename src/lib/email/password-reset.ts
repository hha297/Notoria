import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/stripe/config";

export class ResendConfigError extends Error {
  constructor() {
    super("RESEND_NOT_CONFIGURED");
    this.name = "ResendConfigError";
  }
}

export function isResendConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim(),
  );
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

export function buildPasswordResetUrl(rawToken: string) {
  const base = getAppBaseUrl();
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

type SendPasswordResetEmailInput = {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput) {
  if (!isResendConfigured()) {
    throw new ResendConfigError();
  }

  const resend = getResendClient();
  const from = getFromEmail();
  const safeName = input.name.trim() || "there";

  const html = buildPasswordResetEmailHtml({
    name: safeName,
    resetUrl: input.resetUrl,
    expiresInMinutes: input.expiresInMinutes,
  });

  const text = [
    `Hi ${safeName},`,
    "",
    "We received a request to reset your Notoria password.",
    `This link expires in ${input.expiresInMinutes} minutes:`,
    input.resetUrl,
    "",
    "If you did not request a password reset, you can safely ignore this email.",
    "",
    "— Notoria",
  ].join("\n");

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: "Reset your Notoria password",
    html,
    text,
  });

  if (result.error) {
    throw new Error("EMAIL_SEND_FAILED");
  }

  return result.data;
}

function buildPasswordResetEmailHtml(input: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}) {
  const brand = "#f7a501";
  const ink = "#23251d";
  const muted = "#5e6a72";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your Notoria password</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f1;font-family:IBM Plex Sans,Helvetica,Arial,sans-serif;color:${ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e6eaed;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.03em;">
                  Noto<span style="color:${brand};">ria</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;">Reset your password</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:${muted};">
                  Hi ${escapeHtml(input.name)}, we received a request to reset the password for your Notoria account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:${brand};color:${ink};text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:10px;">
                  Reset password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:${muted};">
                  This link expires in ${input.expiresInMinutes} minutes. If the button does not work, copy and paste this URL into your browser:
                </p>
                <p style="margin:10px 0 0;font-size:12px;line-height:1.5;word-break:break-all;color:${ink};">
                  ${escapeHtml(input.resetUrl)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:${muted};">
                  If you did not request a password reset, you can safely ignore this email. Your password will stay the same.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
