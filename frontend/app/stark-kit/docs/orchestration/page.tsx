import type { Metadata } from "next";
import {
  DocPage,
  DocH1,
  DocH2,
  DocH3,
  DocLead,
  DocP,
  InlineCode,
  DocCallout,
} from "@/components/doc-primitives";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Orchestration",
  description:
    "Multi-agent handoffs with createHandoffTool, lifecycle hooks for guardrails, and structured outputs with outputType.",
};

const HANDOFF_CODE = `import "dotenv/config";
import { Agent, run, createHandoffTool, MistralProvider } from "@mehularora/stark-kit";

const provider = new MistralProvider({ model: "mistral-large-latest" });

// Specialised downstream agents
const billingAgent = new Agent({
  name: "BillingAgent",
  provider,
  instructions: "You handle billing questions, refunds, and invoice disputes. Be concise and accurate.",
});

const supportAgent = new Agent({
  name: "SupportAgent",
  provider,
  instructions: "You handle technical issues and product bugs. Ask for reproduction steps.",
});

// The triage agent routes to the right specialist
const triageAgent = new Agent({
  name: "TriageAgent",
  provider,
  instructions: "Determine the customer intent and hand off to the correct specialist immediately. Do not answer yourself.",
  tools: [
    createHandoffTool(billingAgent),
    createHandoffTool(supportAgent),
  ],
});

const response = await run({
  agent: triageAgent,
  messages: "I need a refund for order #4821.",
});

if (response.status === "complete") {
  console.log("Handled by:", response.agent.name); // "BillingAgent"
  console.log("Answer:", response.content);
}`;

const HANDOFF_RESULT_CODE = `// After run() completes following a handoff:
console.log(response.agent.name);   // The agent that produced the final answer
console.log(response.content);       // The final answer text`;

const HOOKS_CODE = `import "dotenv/config";
import { Agent, ClaudeProvider } from "@mehularora/stark-kit";

const provider = new ClaudeProvider({ model: "claude-3-5-sonnet-latest" });

const agent = new Agent({
  name: "SecureAgent",
  provider,
  instructions: "Handle user requests.",
  hooks: {
    // Runs before every LLM call — return a modified history or nothing
    beforeChat: async (history) => {
      return history.map(msg => ({
        ...msg,
        // Redact API keys from user messages before sending to the LLM
        content: typeof msg.content === "string"
          ? msg.content.replace(/api_key=[\\w-]+/gi, "api_key=REDACTED")
          : msg.content,
      }));
    },

    // Runs before each tool execution — throw to block, return new args to override
    beforeTool: async (toolName, args) => {
      if (toolName === "deleteFiles" && (args as any).path.startsWith("/etc")) {
        throw new Error("Permission denied: cannot delete system files.");
      }
      // Returning undefined (or nothing) allows the call to proceed unchanged
    },

    // Runs after each tool execution — return a modified result string or nothing
    afterTool: async (toolName, result, isError) => {
      // Mask Social Security numbers in tool responses before the LLM sees them
      return result.replace(/\\b\\d{3}-\\d{2}-\\d{4}\\b/g, "***-**-****");
    },
  },
});`;

const HOOKS_SIGNATURES_CODE = `// AgentHooks interface reference
interface AgentHooks {
  // Called with the full message history before every LLM step.
  // Return a CanonicalMessage[] to replace the history, or undefined to keep it.
  beforeChat?(history: CanonicalMessage[]): Promise<CanonicalMessage[] | void>;

  // Called with the tool name and parsed arguments before execution.
  // Throw to block the call. Return new args to override them.
  beforeTool?(toolName: string, args: unknown): Promise<unknown | void>;

  // Called with the tool name, result string, and error flag after execution.
  // Return a new string to replace the result the LLM will see.
  afterTool?(toolName: string, result: string, isError: boolean): Promise<string | void>;
}`;

const STRUCTURED_OUTPUT_CODE = `import "dotenv/config";
import { Agent, run, OpenAIProvider } from "@mehularora/stark-kit";
import z from "zod";

const provider = new OpenAIProvider({ model: "gpt-4o" });

// Define the exact shape of the response you want
const FeedbackSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  topics: z.array(z.string()).describe("Main topics mentioned in the feedback"),
  score: z.number().min(0).max(10).describe("Sentiment intensity from 0 to 10"),
});

const analyzer = new Agent({
  name: "FeedbackAnalyzer",
  provider,
  instructions: "Analyze customer feedback. Extract sentiment, topics, and a severity score.",
  outputType: FeedbackSchema,   // ← bind the output schema here
});

const result = await run({
  agent: analyzer,
  messages: "The checkout was confusing and the email confirmation never arrived. Very frustrating.",
});

if (result.status === "complete") {
  // result.finalOutput is typed as z.infer<typeof FeedbackSchema>
  console.log(result.finalOutput);
  // → { sentiment: "negative", topics: ["checkout", "email confirmation"], score: 8 }
}`;

export default function OrchestrationPage() {
  return (
    <DocPage>
      <DocH1>Orchestration</DocH1>
      <DocLead>
        Build multi-agent networks with <InlineCode>createHandoffTool</InlineCode>, add guardrails
        with lifecycle hooks, and force structured JSON responses with{" "}
        <InlineCode>outputType</InlineCode>.
      </DocLead>

      <DocH2>Agent Handoffs</DocH2>
      <DocP>
        Use <InlineCode>createHandoffTool(targetAgent)</InlineCode> to give an agent the ability to
        transfer execution to another agent. When the triage agent calls the handoff tool, the run
        loop transparently switches to the target agent and continues from there. The original agent
        never sees the target agent's response — the loop just picks up as if you had called{" "}
        <InlineCode>run()</InlineCode> on the target agent directly.
      </DocP>
      <CodeBlock className="mt-4" code={HANDOFF_CODE} language="typescript" filename="swarm.ts" />

      <DocH3>Reading the result after a handoff</DocH3>
      <DocP>
        After the loop completes, <InlineCode>response.agent</InlineCode> tells you which agent
        produced the final answer. This is useful for logging, analytics, or rendering the response
        with the right agent branding in a chat UI.
      </DocP>
      <CodeBlock className="mt-4" code={HANDOFF_RESULT_CODE} language="typescript" />

      <DocCallout type="note">
        You can chain handoffs — BillingAgent could itself have a handoff tool to a RefundsAgent if
        needed. The run loop follows the chain automatically, subject to the{" "}
        <InlineCode>maxSteps</InlineCode> budget.
      </DocCallout>

      <DocH2>Lifecycle Hooks</DocH2>
      <DocP>
        The <InlineCode>hooks</InlineCode> option on <InlineCode>Agent</InlineCode> lets you inject
        behavior at three key points in the run loop without modifying the tool or provider code.
        This is useful for guardrails, logging, secrets redaction, and policy enforcement.
      </DocP>
      <CodeBlock className="mt-4" code={HOOKS_CODE} language="typescript" filename="hooks.ts" />

      <DocH3>Hook signatures</DocH3>
      <CodeBlock className="mt-4" code={HOOKS_SIGNATURES_CODE} language="typescript" />

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
          Hook Reference
        </div>
        <div className="divide-y divide-border text-sm">
          {[
            ["beforeChat", "Receives the full message history. Return a modified history to replace it, or return nothing to leave it unchanged. Good for redacting sensitive data before it reaches the LLM."],
            ["beforeTool", "Receives the tool name and parsed arguments. Throw an Error to block execution entirely. Return new arguments to override what the model chose. Return nothing to proceed as-is."],
            ["afterTool", "Receives the tool name, its string result, and a boolean indicating if it errored. Return a new string to replace the result the LLM sees. Useful for masking PII or normalizing output."],
          ].map(([hook, desc]) => (
            <div key={hook} className="flex min-w-0 flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-6">
              <code className="shrink-0 font-mono text-xs text-foreground sm:w-32">{hook}</code>
              <p className="min-w-0 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <DocH2>Structured Outputs</DocH2>
      <DocP>
        Pass a Zod schema to the <InlineCode>outputType</InlineCode> option and Stark-Kit injects
        the schema contract into the system prompt and auto-configures a{" "}
        <InlineCode>submit_final_output</InlineCode> tool. The model <em>must</em> call that tool
        to finish — plain text responses are rejected and retried automatically.
      </DocP>
      <CodeBlock className="mt-4" code={STRUCTURED_OUTPUT_CODE} language="typescript" filename="structured.ts" />

      <DocH3>Accessing the typed output</DocH3>
      <DocP>
        When an agent has <InlineCode>outputType</InlineCode> set, the final result has a{" "}
        <InlineCode>finalOutput</InlineCode> field typed as{" "}
        <InlineCode>z.infer&lt;typeof YourSchema&gt;</InlineCode>. The regular{" "}
        <InlineCode>result.content</InlineCode> is still populated with the JSON string for
        convenience.
      </DocP>

      <DocCallout type="tip">
        Structured outputs and tools can be combined on the same agent. The model can call tools
        freely during its reasoning steps and then submit the final structured answer when it's done.
      </DocCallout>

      <DocCallout type="warning">
        Not all providers support structured outputs equally well. If you see the model failing to
        call <InlineCode>submit_final_output</InlineCode>, try increasing{" "}
        <InlineCode>maxSteps</InlineCode> or switching to a more capable model.
      </DocCallout>
    </DocPage>
  );
}
