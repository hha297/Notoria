"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type UserButtonProps = {
  name: string;
  email: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserButton({ name, email }: UserButtonProps) {
  const router = useRouter();
  const t = useTranslations("auth");

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar/40 px-2 py-2 text-left text-sm transition-colors",
          "hover:bg-accent-lime/10 data-popup-open:bg-accent-lime/10",
          "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-lime/20 text-xs font-semibold text-accent-lime">
          {getInitials(name) || "U"}
        </span>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate font-medium text-sidebar-foreground">
            {name}
          </span>
          <span className="block truncate text-xs text-on-dark-muted">
            {email}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-on-dark-muted group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">{email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/account" />}>
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
