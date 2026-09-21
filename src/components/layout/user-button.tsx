"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/account/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import navStyles from "@/components/style/layout/nav.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type UserButtonProps = {
  name: string;
  email: string;
  image?: string | null;
  isPro?: boolean;
  onNavigate?: () => void;
  active?: boolean;
};

export function UserButton({
  name,
  email,
  image,
  isPro = false,
  onNavigate,
  active = false,
}: UserButtonProps) {
  const router = useRouter();
  const t = useTranslations("auth");
  const tb = useTranslations("billing");

  async function handleSignOut() {
    onNavigate?.();
    await signOut({ redirect: false });
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          mx(
            navStyles,
            "nav-account-trigger flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm outline-none",
            active && "is-active",
          ),
          "focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <UserAvatar name={name} image={image} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="block truncate font-medium text-ink">{name}</span>
            {isPro ? (
              <Badge variant="pro" className="h-4 px-1.5 text-[10px]">
                {tb("proBadge")}
              </Badge>
            ) : null}
          </span>
          <span className="block truncate font-heading text-[11px] text-muted-foreground">
            {email}
          </span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-ink">{name}</span>
                {isPro ? (
                  <Badge variant="pro" className="h-4 px-1.5 text-[10px]">
                    {tb("proBadge")}
                  </Badge>
                ) : null}
              </span>
              <span className="text-xs text-muted-foreground">{email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link href="/account" onClick={onNavigate} />}
          >
            <User className="size-4" />
            {t("accountSettings")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="size-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
