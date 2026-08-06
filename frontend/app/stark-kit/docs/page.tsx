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
  title: "Get Started",
  description:
    "An overview of Stark-Kit — what it is, why it exists, and how its three-part architecture works.",
};

export default function GetStartedPage() {
  return (
    <DocPage>
      <DocH1>Get Started</DocH1>
      <DocLead>
        Stark-Kit is a lightweight, strictly typed, and provider-agnostic TypeScript framework for
        building AI agents. Write your agentic loops once and run them on OpenAI, Claude, Gemini, or
        Mistral — without touching your core application logic.
      </DocLead>

      <DocH2>Why Stark-Kit?</DocH2>
      <DocP>
        Most agent frameworks tightly couple your business logic to a specific provider's SDK. When
        you need to switch models — for cost, capability, or compliance reasons — you end up
        rewriting large portions of your code. Stark-Kit addresses this by introducing a
        provider-agnostic execution model centered around a unified{" "}
        <InlineCode>CanonicalMessage</InlineCode> interface. Every LLM adapter speaks the same
        internal language, so your agent code never needs to know which provider it's running on.
      </DocP>
      <DocP>
        Beyond provider portability, Stark-Kit ships with everything you need to build
        production-grade agentic systems out of the box:
      </DocP>
      <ul className="mt-4 space-y-2 pl-4 text-sm text-muted-foreground sm:text-base">
        {[
          ["Strictly Typed Tools", "Runtime schema validation via Zod — the model can't call a tool with wrong arguments."],
          ["Real-Time Streaming", "Stream text chunks, tool call events, and lifecycle states as they occur."],
          ["Lifecycle Hooks", "Intercept calls before they reach the LLM or before/after tool execution."],
          ["Human-in-the-Loop (HITL)", "Pause execution mid-run to get human approval before running sensitive tools."],
          ["Agent Handoffs", "Route conversations between specialized agents at runtime."],
          ["Structured Outputs", "Bind an agent to a Zod schema and force structured JSON responses."],
        ].map(([title, desc]) => (
          <li key={title} className="flex gap-2">
            <span className="mt-0.5 text-primary">•</span>
            <span>
              <strong className="font-medium text-foreground">{title}</strong> — {desc}
            </span>
          </li>
        ))}
      </ul>

      <DocH2>Architecture</DocH2>
      <DocP>
        Stark-Kit has three main components that work together to keep vendor logic separate from
        your agent code:
      </DocP>

      <DocH2 id="agent">1. The Agent</DocH2>
      <DocP>
        An <InlineCode>Agent</InlineCode> encapsulates everything that defines an agent's behaviour:
        its system instructions, the tools it can call, the provider it runs on, runtime parameters
        like temperature and max steps, lifecycle hooks, and an optional output schema. An agent is a
        pure configuration object — it doesn't do anything on its own. It tells the run loop{" "}
        <em>how</em> to behave.
      </DocP>

      <DocH2 id="provider">2. The Provider</DocH2>
      <DocP>
        A <InlineCode>Provider</InlineCode> is a standard interface implemented by each LLM adapter:
        <InlineCode>OpenAIProvider</InlineCode>, <InlineCode>ClaudeProvider</InlineCode>,{" "}
        <InlineCode>GeminiProvider</InlineCode>, and <InlineCode>MistralProvider</InlineCode>. Each
        adapter translates Stark-Kit's internal message structure into the native format that provider
        expects, and maps the response back to a unified shape. You can also implement the{" "}
        <InlineCode>Provider</InlineCode> interface yourself to add any LLM backend.
      </DocP>

      <DocH2 id="run-loop">3. The Run Loop</DocH2>
      <DocP>
        <InlineCode>run()</InlineCode> and <InlineCode>runStream()</InlineCode> are the orchestrators.
        They manage the message history, call the provider, execute tools when requested, apply
        lifecycle hooks, handle HITL pauses, and transition control between agents during handoffs.
        The loop repeats until the model stops calling tools, a HITL pause is triggered, or{" "}
        <InlineCode>maxSteps</InlineCode> is exceeded.
      </DocP>

      <CodeBlock
        className="mt-6"
        language="typescript"
        filename="overview.ts"
        code={`import "dotenv/config";
import { Agent, run, defineTool, OpenAIProvider } from "@mehularora/stark-kit";
import z from "zod";

// 1. Create a provider — reads OPENAI_API_KEY from environment
const provider = new OpenAIProvider({ model: "gpt-4o" });

// 2. Define a typed tool
const lookupTool = defineTool({
  name: "lookupUser",
  description: "Look up a user by email.",
  parameters: z.object({ email: z.string().email() }),
  execute: async ({ email }) => {
    return { id: 1, name: "Alice", email };
  },
});

// 3. Configure the agent
const agent = new Agent({
  name: "SupportBot",
  provider,
  instructions: "You are a support assistant. Look up user data when needed.",
  tools: [lookupTool],
  maxSteps: 10,
});

// 4. Run the loop
const result = await run({ agent, messages: "Who is user@example.com?" });

if (result.status === "complete") {
  console.log(result.content);
}`}
      />

      <DocCallout type="tip">
        Ready to write your first agent? Head to{" "}
        <strong>Quick Start</strong> for the fastest path to a running agent, or jump straight to{" "}
        <strong>Make Your First Agent</strong> for a full walkthrough with tools and streaming.
      </DocCallout>
    </DocPage>
  );
}
