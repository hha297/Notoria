"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  Home,
  Languages,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserButton } from "@/components/layout/user-button";
import { cn } from "@/lib/utils";

const navItems = [
  { titleKey: "dashboard", href: "/", icon: Home },
  { titleKey: "vocabulary", href: "/vocabulary", icon: Languages },
  { titleKey: "exercises", href: "/exercises", icon: Dumbbell },
] as const;

type AppSidebarProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
};

export function AppSidebar({ userName, userEmail, userImage }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="sidebar-starfield border-r border-sidebar-border"
    >
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3 pb-2">
        <Link
          href="/"
          onClick={closeMobileSidebar}
          className={cn(
            "flex items-center rounded-md outline-none transition-opacity hover:opacity-90",
            "group-data-[collapsible=icon]:justify-center",
          )}
        >
          <Logo className="hidden group-data-[collapsible=icon]:block" />
          <div className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:hidden">
            <Logo size="md" />
            <LogoWordmark tone="sidebar" />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-[0.25px] text-on-dark-muted">
            {t("workspace")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.titleKey} className="py-0.5">
                  <SidebarMenuButton
                    render={
                      <Link href={item.href} onClick={closeMobileSidebar} />
                    }
                    isActive={
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)
                    }
                    tooltip={t(item.titleKey)}
                    className={cn(
                      "text-sidebar-foreground transition-colors",
                      "hover:bg-accent-lime/25! hover:text-accent-lime!",
                      "data-active:bg-accent-lime/25! data-active:text-accent-lime! data-active:font-medium",
                    )}
                  >
                    <item.icon />
                    <span className="font-medium">{t(item.titleKey)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <UserButton name={userName} email={userEmail} image={userImage} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
