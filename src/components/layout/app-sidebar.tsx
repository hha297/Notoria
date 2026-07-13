"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Dumbbell,
  Home,
  Languages,
  PenLine,
  Settings,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", href: "/", icon: Home },
  { title: "Vocabulary", href: "/vocabulary", icon: Languages },
  { title: "Exercises", href: "/exercises", icon: Dumbbell },
  { title: "Grammar", href: "/grammar", icon: BookOpen, disabled: true },
  { title: "Writing", href: "/writing", icon: PenLine, disabled: true },
  { title: "Settings", href: "/settings", icon: Settings, disabled: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="sidebar-starfield border-r border-sidebar-border"
    >
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3 pb-2">
        <Link
          href="/"
          className={cn(
            "flex items-center rounded-md outline-none transition-opacity hover:opacity-90",
            "group-data-[collapsible=icon]:justify-center",
          )}
        >
          <Logo className="hidden group-data-[collapsible=icon]:block" />
          <div className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:hidden">
            <Logo />
            <LogoWordmark />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-[0.25px] text-on-dark-muted">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title} className="py-0.5">
                  {item.disabled ? (
                    <SidebarMenuButton
                      disabled
                      tooltip={item.title}
                      className="text-on-dark-muted opacity-50"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href)
                      }
                      tooltip={item.title}
                      className={cn(
                        "text-sidebar-foreground transition-colors",
                        "hover:bg-accent-lime/25! hover:text-accent-lime!",
                        "data-active:bg-accent-lime/25! data-active:text-accent-lime! data-active:font-medium",
                      )}
                    >
                      <item.icon />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 text-xs text-on-dark-muted group-data-[collapsible=icon]:hidden">
        Private language-learning workspace
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
