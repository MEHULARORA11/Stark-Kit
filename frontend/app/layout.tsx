import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";

const geistMonoHeading = Geist_Mono({ subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Stark-Kit — Provider-Agnostic AI Agent Framework",
    template: "%s | Stark-Kit",
  },
  description:
    "Stark-Kit is a lightweight, strictly typed, and provider-agnostic TypeScript framework for building AI agents on OpenAI, Claude, Gemini, and Mistral.",
  keywords: ["AI agents", "TypeScript", "OpenAI", "Claude", "Gemini", "Mistral", "LLM"],
  authors: [{ name: "Mehul Arora", url: "https://www.mehularora.dev" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        geistMonoHeading.variable
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
