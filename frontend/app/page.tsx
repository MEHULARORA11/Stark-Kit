import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { CodeBlock } from "@/components/code-block";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  CodeIcon,
  Activity01Icon,
  ShieldKeyIcon,
  UserMultiple02Icon,
  FlowIcon,
  ArrowRight01Icon,
  GithubIcon,
  PackageIcon,
} from "@hugeicons/core-free-icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stark-Kit — Provider-Agnostic AI Agent Framework",
  description:
    "A lightweight, strictly typed TypeScript framework for building AI agents on OpenAI, Claude, Gemini, and Mistral.",
};

const INSTALL_CODE = `bun add @mehularora/stark-kit zod`;

const BASIC_AGENT_CODE = `import "dotenv/config";
import { Agent, run, defineTool, ClaudeProvider } from "@mehularora/stark-kit";
import z from "zod";

const provider = new ClaudeProvider();

const weatherTool = defineTool({
  name: "getWeather",
  description: "Get the current weather for a city.",
  parameters: z.object({
    city: z.string().describe("The name of the city"),
  }),
  execute: async ({ city }) => {
    return \`The weather in \${city} is sunny and 22°C.\`;
  },
});

const agent = new Agent({
  name: "WeatherBot",
  provider,
  instructions: "You are a helpful assistant. Keep answers brief.",
  tools: [weatherTool],
});

const response = await run({ agent, messages: "What's the weather in Tokyo?" });

if (response.status === "complete") {
  console.log(response.content);
}`;

const features = [
  {
    icon: CodeIcon,
    title: "Strictly Typed Tools",
    description:
      "Define tools with Zod schemas for full type-safety and runtime validation. Your IDE knows the shape of every argument.",
  },
  {
    icon: Activity01Icon,
    title: "Real-Time Streaming",
    description:
      "Stream text deltas, tool call events, and lifecycle states with runStream to build responsive, live-updating UIs.",
  },
  {
    icon: ShieldKeyIcon,
    title: "Lifecycle Hooks",
    description:
      "Intercept LLM calls and tool executions with beforeChat, beforeTool, and afterTool hooks to sanitize, redact, or block.",
  },
  {
    icon: AiBrain01Icon,
    title: "Human-in-the-Loop",
    description:
      "Mark tools with requiresApproval to pause execution. Resume with approve, reject, or modified arguments after review.",
  },
  {
    icon: UserMultiple02Icon,
    title: "Agent Handoffs",
    description:
      "Route requests between specialized agents at runtime. Build multi-agent networks with createHandoffTool.",
  },
  {
    icon: FlowIcon,
    title: "Structured Outputs",
    description:
      "Bind an agent to a Zod schema with outputType. The run loop enforces structured JSON responses automatically.",
  },
];

const providers = [
  { name: "OpenAI", key: "OPENAI_API_KEY", model: "gpt-4o", color: "text-emerald-600 dark:text-emerald-400" },
  { name: "Claude", key: "ANTHROPIC_API_KEY", model: "claude-3-5-sonnet-latest", color: "text-orange-600 dark:text-orange-400" },
  { name: "Gemini", key: "GEMINI_API_KEY", model: "gemini-1.5-flash", color: "text-blue-600 dark:text-blue-400" },
  { name: "Mistral", key: "MISTRAL_API_KEY", model: "mistral-large-latest", color: "text-purple-600 dark:text-purple-400" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Stark-Kit
            </span>
            <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              v1
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/stark-kit/docs"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Docs
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2} />
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden border-b border-border py-20 sm:py-32">
          {/* Background gradient */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.488 0.243 264.376 / 15%), transparent)",
            }}
          />
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Open-source &bull; TypeScript &bull; MIT License
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Build AI agents
              <br />
              <span className="text-primary">without lock-in</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Stark-Kit is a lightweight, strictly typed, and provider-agnostic TypeScript
              framework for building AI agents. Write your agentic loops once and run them on
              OpenAI, Claude, Gemini, or Mistral — no rewrites, no lock-in.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/stark-kit/docs"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Get Started
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" strokeWidth={2} />
              </Link>
              <Link
                href="/stark-kit/docs/quick-start"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Quick Start
              </Link>
            </div>
            {/* External links row */}
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/MEHULARORA11/Stark-Kit"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <HugeiconsIcon icon={GithubIcon} className="size-4" strokeWidth={1.5} />
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/@mehularora/stark-kit"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <HugeiconsIcon icon={PackageIcon} className="size-4" strokeWidth={1.5} />
                npm
              </a>
              <a
                href="https://www.mehularora.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Portfolio →
              </a>
            </div>
          </div>
        </section>

        {/* ── Install + Code preview ── */}
        <section className="border-b border-border py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-10">
              {/* Install */}
              <div className="space-y-4">
                <h2 className="font-heading text-xl font-semibold text-foreground">Install</h2>
                <CodeBlock
                  code={INSTALL_CODE}
                  language="bash"
                  className="min-w-[280px]"
                />
                <p className="text-sm text-muted-foreground">
                  Peer dep: <code className="rounded bg-muted px-1 font-mono text-xs">zod</code>
                </p>
              </div>
              {/* Code preview */}
              <div className="space-y-4">
                <h2 className="font-heading text-xl font-semibold text-foreground">Minimal Example</h2>
                <CodeBlock
                  code={BASIC_AGENT_CODE}
                  language="typescript"
                  filename="agent.ts"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="border-b border-border py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                Everything you need
              </h2>
              <p className="mt-3 text-muted-foreground">
                Production-grade primitives, not a toy wrapper.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} size="sm">
                  <CardHeader>
                    <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                      <HugeiconsIcon
                        icon={feature.icon}
                        className="size-5 text-primary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Supported Providers ── */}
        <section className="border-b border-border py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="mb-10 text-center">
              <h2 className="font-heading text-2xl font-bold text-foreground">Supported providers</h2>
              <p className="mt-3 text-muted-foreground">
                Switch providers by swapping a single constructor. Your agent code stays the same.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Provider</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Adapter Class</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Env Variable</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Default Model</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, i) => (
                    <tr
                      key={p.name}
                      className={i < providers.length - 1 ? "border-b border-border" : ""}
                    >
                      <td className={`px-4 py-3 font-medium ${p.color}`}>{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {p.name === "Claude" ? "ClaudeProvider" : `${p.name}Provider`}
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                        {p.key}
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground lg:table-cell">
                        {p.model}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>
            MIT License &bull; Created by{" "}
            <a
              href="https://www.mehularora.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              Mehul Arora
            </a>
          </p>
          <div className="flex gap-5">
            <a
              href="https://github.com/MEHULARORA11/Stark-Kit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={GithubIcon} className="size-4" strokeWidth={1.5} />
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/@mehularora/stark-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={PackageIcon} className="size-4" strokeWidth={1.5} />
              npm
            </a>
            <a
              href="https://www.mehularora.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Portfolio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
