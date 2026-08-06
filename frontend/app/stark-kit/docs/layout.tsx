import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DocsSidebar } from "@/components/docs-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon, PackageIcon } from "@hugeicons/core-free-icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Documentation",
    template: "%s — Stark-Kit Docs",
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <DocsSidebar />
      <SidebarInset className="flex flex-col min-h-svh">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          {/* Breadcrumb placeholder — each page provides its own breadcrumb via the h1 */}
          <span className="text-sm text-muted-foreground">Stark-Kit / Docs</span>
          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            <a
              href="https://github.com/MEHULARORA11/Stark-Kit"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
            >
              <HugeiconsIcon icon={GithubIcon} className="size-4" strokeWidth={1.5} />
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/@mehularora/stark-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
            >
              <HugeiconsIcon icon={PackageIcon} className="size-4" strokeWidth={1.5} />
              npm
            </a>
            <ThemeToggle />
            <Link
              href="/"
              className="hidden sm:inline-flex h-7 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Home
            </Link>
          </div>
        </header>
        {/* Page content */}
        <div className="flex-1">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
