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
  title: "Tools & ToolResult",
  description:
    "Advanced tool definitions including Structured tool agent output, ToolResult, and Handoffs.",
};

const TOOL_RESULT_CODE = `import { defineTool, ToolResult } from "@mehularora/stark-kit";
import z from "zod";

const dbQueryTool = defineTool({
  name: "queryDatabase",
  description: "Execute read-only SQL queries.",
  parameters: z.object({ sql: z.string() }),
  execute: async ({ sql }): Promise<ToolResult> => {
    try {
      const data = await executeSql(sql);
      // Return a structured success object with data
      return { success: true, data };
    } catch (err) {
      // The model receives this error structurally and can self-correct
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});`;

const HANDOFF_CODE = `import { Agent, run, createHandoffTool, MistralProvider } from "@mehularora/stark-kit";

const provider = new MistralProvider({ model: "mistral-large-latest" });

// Specialized downstream agent
const billingAgent = new Agent({
  name: "BillingAgent",
  provider,
  instructions: "You handle billing questions.",
});

// The triage agent routes to the right specialist
const triageAgent = new Agent({
  name: "TriageAgent",
  provider,
  instructions: "Determine intent and hand off.",
  tools: [
    createHandoffTool(billingAgent), // ← Automatically generates a tool for handoff
  ],
});`;

export default function ToolsAdvancedPage() {
  return (
    <DocPage>
      <DocH1>Advanced Tools</DocH1>
      <DocLead>
        Enhance your tools with structured <InlineCode>ToolResult</InlineCode> outputs and enable multi-agent routing with <InlineCode>createHandoffTool</InlineCode>.
      </DocLead>

      <DocH2>Structured Tool Output (ToolResult)</DocH2>
      <DocP>
        By default, tools can return strings or basic objects which are automatically serialized for the LLM. However, for more robust error handling and structured tool agent output, you can return a <InlineCode>ToolResult</InlineCode>.
      </DocP>
      <DocP>
        A <InlineCode>ToolResult</InlineCode> allows you to explicitly mark a tool execution as successful or failed, separating the data payload from error messages. When a tool returns <InlineCode>success: false</InlineCode>, the agent run loop will present the error to the LLM, giving it an opportunity to self-correct and try again.
      </DocP>
      <CodeBlock className="mt-4" code={TOOL_RESULT_CODE} language="typescript" filename="tool-result.ts" />

      <DocCallout type="tip">
        Stark-Kit provides an <InlineCode>isToolResult(value)</InlineCode> type-guard to check if an arbitrary object conforms to the <InlineCode>ToolResult</InlineCode> interface.
      </DocCallout>

      <DocH2>Agent Handoffs</DocH2>
      <DocP>
        Use <InlineCode>createHandoffTool(targetAgent)</InlineCode> to give an agent the ability to transfer execution to another agent. When the agent calls the handoff tool, the run loop transparently switches to the target agent and continues from there.
      </DocP>
      <CodeBlock className="mt-4" code={HANDOFF_CODE} language="typescript" filename="handoff.ts" />

      <DocCallout type="note">
        You can chain handoffs across many agents. After the loop completes, <InlineCode>response.agent</InlineCode> tells you which agent produced the final answer.
      </DocCallout>
    </DocPage>
  );
}
