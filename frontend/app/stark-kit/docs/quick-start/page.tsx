import type { Metadata } from "next";
import {
  DocPage,
  DocH1,
  DocH2,
  DocLead,
  DocP,
  InlineCode,
  DocCallout,
} from "@/components/doc-primitives";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Quick Start",
  description: "The fastest path to a running Stark-Kit AI agent — install, configure, and run in minutes.",
};

const INSTALL_CODE = `bun add @mehularora/stark-kit zod`;

const ENV_CODE = `# .env
ANTHROPIC_API_KEY=your_key_here`;

const DOTENV_CODE = `# Install dotenv for loading .env files at runtime
bun add dotenv`;

const MINIMAL_CODE = `import "dotenv/config";
import { Agent, run, defineTool, ClaudeProvider } from "@mehularora/stark-kit";
import z from "zod";

// Initialize a provider — reads ANTHROPIC_API_KEY automatically
const provider = new ClaudeProvider();

// Define a typed tool
const weatherTool = defineTool({
  name: "getWeather",
  description: "Get the current weather for a city.",
  parameters: z.object({
    city: z.string().describe("The name of the city, e.g. Tokyo"),
  }),
  execute: async ({ city }) => {
    return \`The weather in \${city} is sunny and 22°C.\`;
  },
});

// Configure the agent
const agent = new Agent({
  name: "WeatherBot",
  provider,
  instructions: "You are a helpful assistant. Keep answers brief.",
  tools: [weatherTool],
});

// Execute the run loop
const response = await run({
  agent,
  messages: "What's the weather in Tokyo?",
});

if (response.status === "complete") {
  console.log(response.content);
  // → "The weather in Tokyo is sunny and 22°C."
}`;

export default function QuickStartPage() {
  return (
    <DocPage>
      <DocH1>Quick Start</DocH1>
      <DocLead>
        From zero to a running AI agent in under five minutes. This guide covers installation, API
        key setup, and a minimal WeatherBot example.
      </DocLead>

      <DocH2>1. Install</DocH2>
      <DocP>
        Install Stark-Kit and its peer dependency <InlineCode>zod</InlineCode> using your package
        manager of choice.
      </DocP>
      <CodeBlock className="mt-4" code={INSTALL_CODE} language="bash" />

      <DocCallout type="note">
        The examples in this guide use <strong>bun</strong>. You can also use npm, pnpm, or yarn —
        the API is identical.
      </DocCallout>

      <DocH2>2. Set up your API key</DocH2>
      <DocP>
        Stark-Kit reads provider keys from environment variables automatically. Create a{" "}
        <InlineCode>.env</InlineCode> file in your project root:
      </DocP>
      <CodeBlock className="mt-4" code={ENV_CODE} language="bash" filename=".env" />
      <DocP>
        Then install <InlineCode>dotenv</InlineCode> and import it at the top of your entry file so
        the variables are loaded before Stark-Kit initialises:
      </DocP>
      <CodeBlock className="mt-4" code={DOTENV_CODE} language="bash" />
      <DocP>
        Add <InlineCode>import &quot;dotenv/config&quot;;</InlineCode> as the <strong>first line</strong> of
        your script (before any Stark-Kit imports). See the full example below.
      </DocP>

      <DocH2>3. Write a minimal agent</DocH2>
      <DocP>
        Here is the complete WeatherBot — a single file that installs a tool, configures an agent,
        and runs the loop:
      </DocP>
      <CodeBlock className="mt-4" code={MINIMAL_CODE} language="typescript" filename="weather-bot.ts" />

      <DocH2>What just happened?</DocH2>
      <DocP>
        When you called <InlineCode>run()</InlineCode>, the run loop:
      </DocP>
      <ol className="mt-4 space-y-3 pl-4 text-sm text-muted-foreground sm:text-base">
        {[
          "Sent the user message and the agent's system instructions to Claude.",
          "Claude decided to call the getWeather tool with { city: \"Tokyo\" }.",
          "The run loop executed your tool's execute() function and got back the weather string.",
          "It sent the tool result back to Claude as part of the conversation.",
          "Claude composed its final answer and the loop returned a RunResult with status \"complete\".",
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 flex size-5 mt-0.5 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <DocCallout type="tip">
        The run loop repeats steps 1–4 until the model stops calling tools or{" "}
        <InlineCode>maxSteps</InlineCode> is exceeded (default: 10). This is the core of how
        agentic systems work.
      </DocCallout>

      <DocH2>Next steps</DocH2>
      <DocP>
        Now that you have a working agent, explore the rest of the documentation:
      </DocP>
      <ul className="mt-4 space-y-2 pl-4 text-sm text-muted-foreground sm:text-base">
        {[
          ["Installation Guide", "/stark-kit/docs/installation", "Full provider setup, env vars, and peer deps."],
          ["Make Your First Agent", "/stark-kit/docs/first-agent", "Typed tools, streaming, and reading RunResult in detail."],
          ["Human-in-the-Loop", "/stark-kit/docs/human-in-the-loop", "Pause execution and resume after approval."],
          ["Orchestration", "/stark-kit/docs/orchestration", "Multi-agent handoffs, lifecycle hooks, and structured outputs."],
        ].map(([title, href, desc]) => (
          <li key={title} className="flex gap-2">
            <span className="mt-0.5 text-primary">→</span>
            <span>
              <a href={href} className="font-medium text-foreground hover:underline">
                {title}
              </a>{" "}
              — {desc}
            </span>
          </li>
        ))}
      </ul>
    </DocPage>
  );
}
