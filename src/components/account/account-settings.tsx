"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/account/user-avatar";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removeAvatar,
  updateName,
  updatePassword,
  uploadAvatar,
} from "@/lib/actions/account";

type AccountSettingsProps = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    passwordHash: string | null;
  };
};

export function AccountSettings({ user }: AccountSettingsProps) {
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
    <div className="grid max-w-3xl gap-6">
      <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
        <CardHeader className="border-b border-hairline-cloud px-6 py-5">
          <CardTitle className="text-lg text-ink">{t("avatar")}</CardTitle>
          <CardDescription>{t("avatarDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center">
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
            {image && (
              <Button
                type="button"
                variant="ghost"
                disabled={isAvatarPending}
                onClick={handleRemoveAvatar}
              >
                <Trash2 className="size-4" />
                {t("removeAvatar")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
        <CardHeader className="border-b border-hairline-cloud px-6 py-5">
          <CardTitle className="text-lg text-ink">{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-6">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t("name")}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("email")}
              </p>
              <p className="mt-1 font-medium text-ink">{user.email}</p>
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={isProfilePending || name.trim() === savedName}
            >
              {isProfilePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("saveName")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {user.passwordHash && (
        <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
          <CardHeader className="border-b border-hairline-cloud px-6 py-5">
            <CardTitle className="text-lg text-ink">{t("changePassword")}</CardTitle>
            <CardDescription>{t("passwordHint")}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t("currentPassword")}</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("newPassword")}</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isPasswordPending}>
                {isPasswordPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("updatePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
