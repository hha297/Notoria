"use client";

import styles from "@/components/style/account/account.module.css";
import { mx } from "@/lib/css-module";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
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
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(user.image);
  const [name, setName] = useState(user.name);
  const [savedName, setSavedName] = useState(user.name);
  const [isAvatarPending, startAvatarTransition] = useTransition();
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleAvatarError(error: unknown) {
    const code = error instanceof Error ? error.message : "GENERIC";

    if (code === "INVALID_FILE_TYPE") {
      toast.error(tAuth("avatarInvalidType"));
      return;
    }

    if (code === "FILE_TOO_LARGE") {
      toast.error(tAuth("avatarTooLarge"));
      return;
    }

    if (code === "CLOUDINARY_NOT_CONFIGURED") {
      toast.error(tAuth("avatarNotConfigured"));
      return;
    }

    toast.error(tAuth("avatarUploadFailed"));
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
        toast.success(tAuth("avatarUpdated"));
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
        toast.success(tAuth("avatarRemoved"));
      } catch {
        toast.error(tAuth("avatarUploadFailed"));
      }
    });
  }

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error(tAuth("nameTooShort"));
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
        toast.success(tAuth("nameUpdated"));
      } catch {
        toast.error(tAuth("nameUpdateFailed"));
      }
    });
  }

  function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(tAuth("passwordMismatch"));
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
        toast.success(tAuth("passwordUpdated"));
      } catch (error) {
        const code = error instanceof Error ? error.message : "GENERIC";

        if (code === "INVALID_CURRENT_PASSWORD") {
          toast.error(tAuth("invalidCurrentPassword"));
          return;
        }

        toast.error(tAuth("passwordUpdateFailed"));
      }
    });
  }

  return (
    <div className={mx(styles, "account-stack")}>
      <ProSubscriptionCard
        billing={user.billing}
        checkoutResult={checkoutResult}
      />

      <section className={mx(styles, "account-panel")}>
        <header className={mx(styles, "account-panel-head")}>
          <h2 className={mx(styles, "account-panel-title")}>{t("profile.title")}</h2>
          <p className={mx(styles, "account-panel-lede")}>{t("profile.description")}</p>
        </header>
        <div className={mx(styles, "account-panel-body account-profile-grid")}>
          <div className={mx(styles, "account-avatar-block")}>
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
                {tAuth("changeAvatar")}
              </Button>
              {image ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isAvatarPending}
                  onClick={handleRemoveAvatar}
                >
                  <Trash2 className="size-4" />
                  {tAuth("removeAvatar")}
                </Button>
              ) : null}
            </div>
            <p className={mx(styles, "account-avatar-hint")}>{tAuth("avatarDescription")}</p>
          </div>

          <form onSubmit={handleProfileSubmit} className={mx(styles, "account-form")}>
            <div className={mx(styles, "account-field")}>
              <Label htmlFor="profile-name" className={mx(styles, "account-label")}>
                {tAuth("name")}
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
                className={mx(styles, "account-input")}
              />
            </div>
            <div className={mx(styles, "account-field")}>
              <p className={mx(styles, "account-label")}>{tAuth("email")}</p>
              <p className={mx(styles, "account-email")}>{user.email}</p>
              <p className={mx(styles, "account-field-hint")}>{t("profile.emailHint")}</p>
            </div>
            <Button
              type="submit"
              disabled={isProfilePending || name.trim() === savedName}
            >
              {isProfilePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {tAuth("saveName")}
            </Button>
          </form>
        </div>
      </section>

      {user.passwordHash ? (
        <section className={mx(styles, "account-panel")}>
          <header className={mx(styles, "account-panel-head")}>
            <h2 className={mx(styles, "account-panel-title")}>{t("security.title")}</h2>
            <p className={mx(styles, "account-panel-lede")}>{t("security.description")}</p>
          </header>
          <div className={mx(styles, "account-panel-body")}>
            <form onSubmit={handlePasswordSubmit} className={mx(styles, "account-form")}>
              <div className={mx(styles, "account-field")}>
                <Label htmlFor="current-password" className={mx(styles, "account-label")}>
                  {tAuth("currentPassword")}
                </Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className={mx(styles, "account-input")}
                />
              </div>
              <div className={mx(styles, "account-field")}>
                <Label htmlFor="new-password" className={mx(styles, "account-label")}>
                  {tAuth("newPassword")}
                </Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  className={mx(styles, "account-input")}
                />
              </div>
              <div className={mx(styles, "account-field")}>
                <Label htmlFor="confirm-password" className={mx(styles, "account-label")}>
                  {tAuth("confirmPassword")}
                </Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className={mx(styles, "account-input")}
                />
              </div>
              <p className={mx(styles, "account-field-hint")}>{tAuth("passwordHint")}</p>
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
                {tAuth("updatePassword")}
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      <section className={mx(styles, "account-panel account-panel-danger")}>
        <header className={mx(styles, "account-panel-head")}>
          <h2 className={mx(styles, "account-panel-title")}>{t("danger.title")}</h2>
          <p className={mx(styles, "account-panel-lede")}>{t("danger.description")}</p>
        </header>
        <div className={mx(styles, "account-panel-body account-danger-row")}>
          <div className={mx(styles, "account-danger-copy")}>
            <p className={mx(styles, "account-danger-title")}>{t("danger.deleteTitle")}</p>
            <p className={mx(styles, "account-danger-hint")}>{t("danger.deleteHint")}</p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="shrink-0"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {t("danger.deleteAction")}
          </Button>
        </div>
      </section>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        email={user.email}
      />
    </div>
  );
}
