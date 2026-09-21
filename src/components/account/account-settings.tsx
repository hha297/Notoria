"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ProSubscriptionCard } from "@/components/account/pro-subscription-card";
import { UserAvatar } from "@/components/account/user-avatar";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removeAvatar,
  updateName,
  updatePassword,
  uploadAvatar,
} from "@/lib/actions/account";
import type { BillingState } from "@/lib/stripe/types";

type AccountSettingsProps = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    passwordHash: string | null;
    billing: BillingState;
  };
  checkoutResult?: string;
};

export function AccountSettings({ user, checkoutResult }: AccountSettingsProps) {
  const router = useRouter();
  const { update } = useSession();
  const t = useTranslations("auth");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(user.image);
  const [name, setName] = useState(user.name);
  const [savedName, setSavedName] = useState(user.name);
  const [isAvatarPending, startAvatarTransition] = useTransition();
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleAvatarError(error: unknown) {
    const code = error instanceof Error ? error.message : "GENERIC";

    if (code === "INVALID_FILE_TYPE") {
      toast.error(t("avatarInvalidType"));
      return;
    }

    if (code === "FILE_TOO_LARGE") {
      toast.error(t("avatarTooLarge"));
      return;
    }

    if (code === "CLOUDINARY_NOT_CONFIGURED") {
      toast.error(t("avatarNotConfigured"));
      return;
    }

    toast.error(t("avatarUploadFailed"));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    startAvatarTransition(async () => {
      try {
        const result = await uploadAvatar(formData);
        setImage(result.image);
        await update({ image: result.image });
        router.refresh();
        toast.success(t("avatarUpdated"));
      } catch (error) {
        handleAvatarError(error);
      } finally {
        event.target.value = "";
      }
    });
  }

  function handleRemoveAvatar() {
    startAvatarTransition(async () => {
      try {
        await removeAvatar();
        setImage(null);
        await update({ image: null });
        router.refresh();
        toast.success(t("avatarRemoved"));
      } catch {
        toast.error(t("avatarUploadFailed"));
      }
    });
  }

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error(t("nameTooShort"));
      return;
    }

    if (trimmedName === savedName) {
      return;
    }

    startProfileTransition(async () => {
      try {
        const result = await updateName({ name: trimmedName });
        setName(result.name);
        setSavedName(result.name);
        await update({ name: result.name });
        router.refresh();
        toast.success(t("nameUpdated"));
      } catch {
        toast.error(t("nameUpdateFailed"));
      }
    });
  }

  function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }

    startPasswordTransition(async () => {
      try {
        await updatePassword({
          currentPassword,
          newPassword,
          confirmPassword,
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success(t("passwordUpdated"));
      } catch (error) {
        const code = error instanceof Error ? error.message : "GENERIC";

        if (code === "INVALID_CURRENT_PASSWORD") {
          toast.error(t("invalidCurrentPassword"));
          return;
        }

        toast.error(t("passwordUpdateFailed"));
      }
    });
  }

  return (
    <div className="account-stack">
      <ProSubscriptionCard
        billing={user.billing}
        checkoutResult={checkoutResult}
      />

      <section className="account-panel">
        <header className="account-panel-head">
          <h2 className="account-panel-title">{t("avatar")}</h2>
          <p className="account-panel-lede">{t("avatarDescription")}</p>
        </header>
        <div className="account-panel-body account-avatar-row">
          <UserAvatar name={name} image={image} size="xl" />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="route-quiet-action"
              data-route-action="account"
              disabled={isAvatarPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {isAvatarPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {t("changeAvatar")}
            </Button>
            {image ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isAvatarPending}
                onClick={handleRemoveAvatar}
              >
                <Trash2 className="size-4" />
                {t("removeAvatar")}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="account-panel">
        <header className="account-panel-head">
          <h2 className="account-panel-title">{t("profile")}</h2>
        </header>
        <div className="account-panel-body">
          <form onSubmit={handleProfileSubmit} className="account-form">
            <div className="account-field">
              <Label htmlFor="profile-name" className="account-label">
                {t("name")}
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
                className="account-input"
              />
            </div>
            <div className="account-field">
              <p className="account-label">{t("email")}</p>
              <p className="account-email">{user.email}</p>
            </div>
            <Button
              type="submit"
              disabled={isProfilePending || name.trim() === savedName}
            >
              {isProfilePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("saveName")}
            </Button>
          </form>
        </div>
      </section>

      {user.passwordHash ? (
        <section className="account-panel">
          <header className="account-panel-head">
            <h2 className="account-panel-title">{t("changePassword")}</h2>
            <p className="account-panel-lede">{t("passwordHint")}</p>
          </header>
          <div className="account-panel-body">
            <form onSubmit={handlePasswordSubmit} className="account-form">
              <div className="account-field">
                <Label htmlFor="current-password" className="account-label">
                  {t("currentPassword")}
                </Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className="account-input"
                />
              </div>
              <div className="account-field">
                <Label htmlFor="new-password" className="account-label">
                  {t("newPassword")}
                </Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  className="account-input"
                />
              </div>
              <div className="account-field">
                <Label htmlFor="confirm-password" className="account-label">
                  {t("confirmPassword")}
                </Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="account-input"
                />
              </div>
              <Button
                type="submit"
                disabled={
                  isPasswordPending ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {isPasswordPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("updatePassword")}
              </Button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
