"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import {
  ResendConfigError,
  isResendConfigured,
} from "@/lib/email/password-reset";
import {
  sendFeedbackEmail,
  type FeedbackAttachment,
  type FeedbackType,
} from "@/lib/email/feedback";

const FEEDBACK_TYPES = ["bug", "feature", "general"] as const;

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const feedbackFieldsSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  message: z.string().trim().min(10).max(5000),
  email: z.string().trim().email().max(254).optional(),
  pagePath: z.string().trim().max(200).optional(),
});

export type SubmitFeedbackResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INVALID_INPUT"
        | "EMAIL_REQUIRED"
        | "RATE_LIMITED"
        | "EMAIL_NOT_CONFIGURED"
        | "EMAIL_SEND_FAILED"
        | "INVALID_IMAGE"
        | "IMAGE_TOO_LARGE"
        | "TOO_MANY_IMAGES";
    };

function clientKeyFromHeaders(headerStore: Headers) {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip")?.trim() || "unknown";
}

function extensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

async function readFeedbackImages(
  formData: FormData,
): Promise<
  | { ok: true; attachments: FeedbackAttachment[] }
  | {
      ok: false;
      code: "INVALID_IMAGE" | "IMAGE_TOO_LARGE" | "TOO_MANY_IMAGES";
    }
> {
  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length > MAX_IMAGES) {
    return { ok: false, code: "TOO_MANY_IMAGES" };
  }

  const attachments: FeedbackAttachment[] = [];

  for (const [index, file] of files.entries()) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { ok: false, code: "INVALID_IMAGE" };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, code: "IMAGE_TOO_LARGE" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80);
    attachments.push({
      filename:
        safeName && /\.(jpe?g|png|webp|gif)$/i.test(safeName)
          ? safeName
          : `screenshot-${index + 1}.${extensionForType(file.type)}`,
      content: buffer,
      contentType: file.type,
    });
  }

  return { ok: true, attachments };
}

export async function submitFeedback(
  formData: FormData,
): Promise<SubmitFeedbackResult> {
  const emailRaw = String(formData.get("email") ?? "").trim();
  const parsed = feedbackFieldsSchema.safeParse({
    type: String(formData.get("type") ?? ""),
    message: String(formData.get("message") ?? ""),
    email: emailRaw || undefined,
    pagePath: String(formData.get("pagePath") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const imagesResult = await readFeedbackImages(formData);
  if (!imagesResult.ok) {
    return { ok: false, code: imagesResult.code };
  }

  const session = await getSession();
  const authenticated = Boolean(session?.user?.id && session.user.email);
  const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? null;

  let userEmail = sessionEmail;
  if (!authenticated) {
    const guestEmail = parsed.data.email?.trim().toLowerCase();
    if (!guestEmail) {
      return { ok: false, code: "EMAIL_REQUIRED" };
    }
    userEmail = guestEmail;
  }

  if (!userEmail) {
    return { ok: false, code: "EMAIL_REQUIRED" };
  }

  const headerStore = await headers();
  const rateKey = authenticated
    ? `feedback:user:${session!.user!.id}`
    : `feedback:ip:${clientKeyFromHeaders(headerStore)}:${userEmail}`;

  const rate = consumeRateLimit({
    key: rateKey,
    limit: authenticated ? 5 : 3,
    windowMs: authenticated ? 60 * 60 * 1000 : 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    return { ok: false, code: "RATE_LIMITED" };
  }

  if (!isResendConfigured()) {
    console.error("Feedback skipped: Resend is not configured");
    return { ok: false, code: "EMAIL_NOT_CONFIGURED" };
  }

  const rawPath = parsed.data.pagePath?.trim();
  const pagePath =
    rawPath &&
    rawPath.startsWith("/") &&
    !rawPath.includes("://") &&
    !rawPath.includes("\n")
      ? rawPath.slice(0, 200)
      : undefined;
  const userAgent = headerStore.get("user-agent")?.slice(0, 300) || undefined;

  try {
    await sendFeedbackEmail({
      type: parsed.data.type as FeedbackType,
      message: parsed.data.message,
      userEmail,
      authenticated,
      userId: authenticated ? session!.user!.id : undefined,
      pagePath,
      userAgent,
      attachments: imagesResult.attachments,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ResendConfigError) {
      return { ok: false, code: "EMAIL_NOT_CONFIGURED" };
    }
    console.error("Feedback email failed", error);
    return { ok: false, code: "EMAIL_SEND_FAILED" };
  }
}
