import type { Metadata } from "next";
import {
  DocPage,
  DocH1,
  DocH2,
  DocH3,
  DocLead,
  DocP,
  InlineCode,
} from "@/components/doc-primitives";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Guardrails & Hooks",
  description:
    "Add guardrails to your agent using lifecycle hooks before tool execution, after tool execution, and before LLM chats.",
};

const HOOKS_CODE = `import "dotenv/config";
import { Agent, ClaudeProvider } from "@mehularora/stark-kit";

const provider = new ClaudeProvider();

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

export default function GuardrailsPage() {
  return (
    <DocPage>
      <DocH1>Guardrails & Hooks</DocH1>
      <DocLead>
        The <InlineCode>hooks</InlineCode> option lets you inject behavior at three key points in the run loop. This is useful for guardrails, logging, secrets redaction, and policy enforcement.
      </DocLead>

      <DocH2>Defining Hooks</DocH2>
      <DocP>
        Hooks are provided when defining an <InlineCode>Agent</InlineCode>. They execute automatically during the loop.
      </DocP>
      <CodeBlock className="mt-4" code={HOOKS_CODE} language="typescript" filename="hooks.ts" />

      <DocH3>Hook Signatures</DocH3>
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
    </DocPage>
  );
}
