"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  ZapIcon,
  PackageIcon,
  CodeIcon,
  UserCheck01Icon,
  AiNetworkIcon,
  GithubIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

const NAV_ITEMS = [
  {
    title: "Get Started",
    href: "/stark-kit/docs",
    icon: Home01Icon,
  },
  {
    title: "Quick Start",
    href: "/stark-kit/docs/quick-start",
    icon: ZapIcon,
  },
  {
    title: "Installation Guide",
    href: "/stark-kit/docs/installation",
    icon: PackageIcon,
  },
  {
    title: "Make Your First Agent",
    href: "/stark-kit/docs/first-agent",
    icon: CodeIcon,
  },
  {
    title: "Human-in-the-Loop",
    href: "/stark-kit/docs/human-in-the-loop",
    icon: UserCheck01Icon,
  },
  {
    title: "Orchestration",
    href: "/stark-kit/docs/orchestration",
    icon: AiNetworkIcon,
  },
  {
    title: "Structured Outputs",
    href: "/stark-kit/docs/structured-outputs",
    icon: CodeIcon,
  },
  {
    title: "Guardrails & Hooks",
    href: "/stark-kit/docs/guardrails",
    icon: UserCheck01Icon,
  },
  {
    title: "Advanced Tools",
    href: "/stark-kit/docs/tools-advanced",
    icon: ZapIcon,
  },
  {
    title: "Providers",
    href: "/stark-kit/docs/providers",
    icon: PackageIcon,
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpenMobile(false)}>
          <span className="font-heading text-base font-semibold text-sidebar-foreground">
            Stark-Kit
          </span>
          <span className="rounded-full border border-sidebar-border bg-sidebar-accent px-1.5 py-0.5 text-[10px] text-sidebar-foreground/60">
            docs
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documentation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/stark-kit/docs"
                    ? pathname === "/stark-kit/docs"
                    : pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                    >
                      <HugeiconsIcon icon={item.icon} className="size-4" strokeWidth={1.5} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="py-3">
        <div className="flex flex-col gap-1 px-2">
          <a
            href="https://github.com/MEHULARORA11/Stark-Kit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <HugeiconsIcon icon={GithubIcon} className="size-4" strokeWidth={1.5} />
            GitHub
            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-auto size-3.5 opacity-40" strokeWidth={1.5} />
          </a>
          <a
            href="https://www.npmjs.com/package/@mehularora/stark-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <HugeiconsIcon icon={PackageIcon} className="size-4" strokeWidth={1.5} />
            npm
            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-auto size-3.5 opacity-40" strokeWidth={1.5} />
          </a>
          <a
            href="https://www.mehularora.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <span className="size-4 text-center text-xs leading-4">↗</span>
            Portfolio
            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-auto size-3.5 opacity-40" strokeWidth={1.5} />
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
