"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import styles from "@/components/style/help/help.module.css";
import { mx } from "@/lib/css-module";
import { submitFeedback } from "@/lib/actions/feedback";
import type { FeedbackType } from "@/lib/email/feedback";

const TYPES: FeedbackType[] = ["bug", "feature", "general"];
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type FeedbackFormProps = {
  authenticated: boolean;
  accountEmail?: string | null;
};

type ImagePreview = {
  id: string;
  file: File;
  url: string;
};

export function FeedbackForm({ authenticated, accountEmail }: FeedbackFormProps) {
  const t = useTranslations("sitePages.support.feedback");
  const pathname = usePathname();
  const typeLabelId = useId();
  const messageId = useId();
  const emailId = useId();
  const imagesId = useId();
  const errorId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      for (const image of images) {
        URL.revokeObjectURL(image.url);
      }
    };
    // Only revoke on unmount; individual removals revoke their own URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearImages() {
    setImages((current) => {
      for (const image of current) {
        URL.revokeObjectURL(image.url);
      }
      return [];
    });
  }

  function resetForm() {
    setMessage("");
    setEmail("");
    clearImages();
    setError(null);
    setSent(false);
    setType("general");
  }

  function addImages(fileList: FileList | null) {
    if (!fileList?.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(t("errors.tooManyImages"));
      return;
    }

    const next: ImagePreview[] = [];
    let rejection: "invalid" | "tooLarge" | "tooMany" | null = null;

    for (const file of Array.from(fileList)) {
      if (next.length >= remaining) {
        rejection = "tooMany";
        break;
      }
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        rejection = "invalid";
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        rejection = "tooLarge";
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      });
    }

    if (next.length > 0) {
      setImages((current) => [...current, ...next]);
      if (error) setError(null);
    }

    if (rejection === "tooMany") {
      setError(t("errors.tooManyImages"));
    } else if (rejection === "invalid") {
      setError(t("errors.invalidImage"));
    } else if (rejection === "tooLarge") {
      setError(t("errors.imageTooLarge"));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((image) => image.id !== id);
    });
    if (error) setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError(t("errors.tooShort"));
      return;
    }
    if (trimmed.length > 5000) {
      setError(t("errors.tooLong"));
      return;
    }
    if (!authenticated && !email.trim()) {
      setError(t("errors.emailRequired"));
      return;
    }
    if (images.length > MAX_IMAGES) {
      setError(t("errors.tooManyImages"));
      return;
    }
    for (const image of images) {
      if (!ALLOWED_IMAGE_TYPES.has(image.file.type)) {
        setError(t("errors.invalidImage"));
        return;
      }
      if (image.file.size > MAX_IMAGE_BYTES) {
        setError(t("errors.imageTooLarge"));
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("message", trimmed);
      formData.set("pagePath", pathname || "/support");
      if (!authenticated) {
        formData.set("email", email.trim());
      }
      for (const image of images) {
        formData.append("images", image.file);
      }

      const result = await submitFeedback(formData);

      if (!result.ok) {
        const messageKey =
          result.code === "RATE_LIMITED"
            ? "errors.rateLimited"
            : result.code === "EMAIL_REQUIRED"
              ? "errors.emailRequired"
              : result.code === "EMAIL_NOT_CONFIGURED"
                ? "errors.notConfigured"
                : result.code === "INVALID_INPUT"
                  ? "errors.invalid"
                  : result.code === "INVALID_IMAGE"
                    ? "errors.invalidImage"
                    : result.code === "IMAGE_TOO_LARGE"
                      ? "errors.imageTooLarge"
                      : result.code === "TOO_MANY_IMAGES"
                        ? "errors.tooManyImages"
                        : "errors.sendFailed";
        setError(t(messageKey));
        toast.error(t(messageKey));
        return;
      }

      setSent(true);
      setMessage("");
      clearImages();
      toast.success(t("successToast"));
    });
  }

  if (sent) {
    return (
      <div className={mx(styles, "feedback-success")} role="status">
        <p className={mx(styles, "feedback-success-title")}>{t("successTitle")}</p>
        <p className={mx(styles, "feedback-success-body")}>{t("successBody")}</p>
        <div className={mx(styles, "feedback-actions")}>
          <Button type="button" variant="outline" onClick={resetForm}>
            {t("sendAnother")}
          </Button>
        </div>
      </div>
    );
  }

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <form
      className={mx(styles, "feedback-form")}
      onSubmit={handleSubmit}
      aria-describedby={error ? errorId : undefined}
      noValidate
    >
      <div className={mx(styles, "feedback-field")}>
        <p id={typeLabelId} className={mx(styles, "feedback-type-label")}>
          {t("typeLabel")}
        </p>
        <div
          className={mx(styles, "feedback-type-group")}
          role="radiogroup"
          aria-labelledby={typeLabelId}
        >
          {TYPES.map((value) => {
            const selected = type === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={mx(
                  styles,
                  "feedback-type-chip",
                  selected && "is-active",
                )}
                disabled={isPending}
                onClick={() => setType(value)}
              >
                {t(`types.${value}`)}
              </button>
            );
          })}
        </div>
      </div>

      {!authenticated ? (
        <div className={mx(styles, "feedback-field")}>
          <Label htmlFor={emailId} className={mx(styles, "feedback-field-label")}>
            {t("emailLabel")}
          </Label>
          <Input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
            required
            disabled={isPending}
            aria-invalid={error ? true : undefined}
          />
          <p className={mx(styles, "feedback-hint")}>{t("emailHint")}</p>
        </div>
      ) : accountEmail ? (
        <p className={mx(styles, "feedback-account-note")}>
          {t.rich("accountEmailNote", {
            email: () => <strong>{accountEmail}</strong>,
          })}
        </p>
      ) : null}

      <div className={mx(styles, "feedback-field")}>
        <Label htmlFor={messageId} className={mx(styles, "feedback-field-label")}>
          {t("messageLabel")}
        </Label>
        <Textarea
          id={messageId}
          name="message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            if (error) setError(null);
          }}
          required
          minLength={10}
          maxLength={5000}
          rows={10}
          disabled={isPending}
          placeholder={t(`placeholders.${type}`)}
          className={mx(styles, "feedback-message")}
          aria-invalid={error ? true : undefined}
        />
        <p className={mx(styles, "feedback-hint")}>{t("messageHint")}</p>
      </div>

      <div className={mx(styles, "feedback-field")}>
        <Label htmlFor={imagesId} className={mx(styles, "feedback-field-label")}>
          {t("imagesLabel")}
        </Label>
        <input
          ref={fileInputRef}
          id={imagesId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          disabled={isPending || !canAddMore}
          onChange={(event) => {
            addImages(event.target.files);
          }}
        />
        <div className={mx(styles, "feedback-images")}>
          {images.map((image) => (
            <div key={image.id} className={mx(styles, "feedback-image-preview")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.file.name}
                className={mx(styles, "feedback-image-thumb")}
              />
              <button
                type="button"
                className={mx(styles, "feedback-image-remove")}
                disabled={isPending}
                aria-label={t("removeImage", { name: image.file.name })}
                onClick={() => removeImage(image.id)}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {canAddMore ? (
            <button
              type="button"
              className={mx(styles, "feedback-image-add")}
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden />
              <span>{t("addImages")}</span>
            </button>
          ) : null}
        </div>
        <p className={mx(styles, "feedback-hint")}>{t("imagesHint")}</p>
      </div>

      {error ? (
        <p id={errorId} className={mx(styles, "feedback-error")} role="alert">
          {error}
        </p>
      ) : null}

      <div className={mx(styles, "feedback-actions")}>
        <Button type="submit" disabled={isPending || message.trim().length < 10}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {isPending ? t("sending") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
