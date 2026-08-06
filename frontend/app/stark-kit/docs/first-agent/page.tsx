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
  title: "Make Your First Agent",
  description:
    "Define typed tools with Zod, build an Agent, call run() and runStream(), and read the results.",
};

const DEFINE_TOOL_CODE = `import "dotenv/config";
import { defineTool } from "@mehularora/stark-kit";
import z from "zod";

const searchTool = defineTool({
  name: "searchWeb",
  description: "Search the web for information on a given topic.",
  parameters: z.object({
    query: z.string().describe("The search query string"),
    maxResults: z.number().int().min(1).max(10).optional(),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    // Your actual implementation here
    return { results: [\`Result for "\${query}" (top \${maxResults})\`] };
  },
});`;

const TOOL_RESULT_CODE = `import { defineTool, ToolResult } from "@mehularora/stark-kit";
import z from "zod";

const dbQueryTool = defineTool({
  name: "queryDatabase",
  description: "Execute read-only SQL queries.",
  parameters: z.object({ sql: z.string() }),
  execute: async ({ sql }): Promise<ToolResult> => {
    try {
      const data = await db.query(sql);
      return { success: true, data };
    } catch (err) {
      // The model receives this and can self-correct its query
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});`;

const BUILD_AGENT_CODE = `import "dotenv/config";
import { Agent, OpenAIProvider, defineTool } from "@mehularora/stark-kit";
import z from "zod";

const provider = new OpenAIProvider({ model: "gpt-4o" });

const searchTool = defineTool({
  name: "searchWeb",
  description: "Search the web for a query.",
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => \`Results for "\${query}": ...\`,
});

const agent = new Agent({
  name: "ResearchAssistant",
  provider,
  instructions: "You are a research assistant. Always search before answering factual questions.",
  tools: [searchTool],
  maxSteps: 15,           // stop after 15 steps (default: 10)
  temperature: 0.3,       // lower = more deterministic
  model: "gpt-4o-mini",   // overrides provider default for this agent
});`;

const RUN_CODE = `import { run, isHITLPause } from "@mehularora/stark-kit";

const result = await run({
  agent,
  messages: "What are the latest advancements in quantum computing?",
  maxSteps: 10,      // optional override
  temperature: 0.5,  // optional override
});

// result is either a RunResult or a HITLPause
if (isHITLPause(result)) {
  // A tool with requiresApproval: true was triggered — see HITL docs
  console.log("Waiting for approval:", result.pendingToolCalls);
} else if (result.status === "complete") {
  console.log("Final answer:", result.content);
  // If agent used outputType (structured output):
  // console.log("Structured data:", result.finalOutput);
}`;

const STREAM_CODE = `import "dotenv/config";
import { runStream } from "@mehularora/stark-kit";

const stream = runStream({
  agent,
  messages: "Tell me about quantum computing and then search for recent news.",
});

for await (const event of stream) {
  switch (event.type) {
    case "chunk":
      // Text delta from the model — write to terminal or UI
      if (event.chunk.type === "text") {
        process.stdout.write(event.chunk.delta);
      }
      break;

    case "tool_start":
      console.log(\`\\n[→ Calling: \${event.toolName}]\`);
      break;

    case "tool_end":
      console.log(\`[← Finished: \${event.toolName}]\`);
      break;

    case "handoff":
      // Only emitted during multi-agent handoffs
      console.log(\`[Handing off to: \${event.targetAgentName}]\`);
      break;

    case "step_complete":
      // One full step of the loop completed
      break;

    case "hitl_pause":
      // A tool with requiresApproval triggered mid-stream
      console.log("Paused for approval:", event.result.pendingToolCalls);
      break;

    case "done":
      // Stream finished — event.result is the final RunResult
      console.log("\\n\\nFinal answer:", event.result.content);
      break;
  }
}`;

export default function FirstAgentPage() {
  return (
    <DocPage>
      <DocH1>Make Your First Agent</DocH1>
      <DocLead>
        A full walkthrough of defining typed tools with Zod, constructing an{" "}
        <InlineCode>Agent</InlineCode>, running it with <InlineCode>run()</InlineCode>, and
        upgrading to real-time streaming with <InlineCode>runStream()</InlineCode>.
      </DocLead>

      <DocH2>Defining a Tool</DocH2>
      <DocP>
        Tools are the primary way agents interact with the outside world — APIs, databases, file
        systems, anything. Use <InlineCode>defineTool()</InlineCode> to declare a tool with a name,
        a description (used by the model to decide when to call it), a Zod parameter schema, and an
        <InlineCode>execute</InlineCode> function.
      </DocP>
      <CodeBlock className="mt-4" code={DEFINE_TOOL_CODE} language="typescript" filename="tools.ts" />

      <DocH3>Returning structured errors with ToolResult</DocH3>
      <DocP>
        Instead of throwing errors (which would crash the run loop), you can return a{" "}
        <InlineCode>ToolResult</InlineCode> with <InlineCode>success: false</InlineCode>. The model
        receives the error message and can attempt to self-correct — for example, by rewriting a
        broken SQL query.
      </DocP>
      <CodeBlock className="mt-4" code={TOOL_RESULT_CODE} language="typescript" filename="tools.ts" />

      <DocH2>Building an Agent</DocH2>
      <DocP>
        Pass your tools and a provider instance to <InlineCode>new Agent()</InlineCode>. The{" "}
        <InlineCode>instructions</InlineCode> field becomes the system prompt — be specific about
        when tools should be used.
      </DocP>
      <CodeBlock className="mt-4" code={BUILD_AGENT_CODE} language="typescript" filename="agent.ts" />

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <div className="bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
          Agent Configuration Options
        </div>
        <div className="divide-y divide-border text-sm">
          {[
            ["name", "string", "Required. Identifier for this agent (shown in handoff events)."],
            ["instructions", "string", "Required. The system prompt given to the model on every step."],
            ["provider", "Provider", "Required. An OpenAIProvider, ClaudeProvider, GeminiProvider, or MistralProvider instance."],
            ["tools", "IToolOptions[]", "Optional. Array of tools defined with defineTool()."],
            ["maxSteps", "number", "Optional (default: 10). Maximum number of run loop iterations."],
            ["temperature", "number", "Optional. Sampling temperature passed to the provider."],
            ["model", "string", "Optional. Model name that overrides the provider's default."],
            ["hooks", "AgentHooks", "Optional. beforeChat, beforeTool, afterTool lifecycle callbacks."],
            ["outputType", "z.ZodType", "Optional. A Zod schema that forces structured JSON output."],
          ].map(([prop, type, desc]) => (
            <div key={prop} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-6">
              <div className="flex shrink-0 items-start gap-2 sm:w-48">
                <code className="font-mono text-xs text-foreground">{prop}</code>
                <code className="font-mono text-xs text-muted-foreground">{type}</code>
              </div>
              <p className="text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <DocH2>Running the Agent</DocH2>
      <DocP>
        Call <InlineCode>run()</InlineCode> with the agent and a user message. The message can be a
        plain string or a <InlineCode>CanonicalMessage[]</InlineCode> array for multi-turn
        conversations.
      </DocP>
      <CodeBlock className="mt-4" code={RUN_CODE} language="typescript" filename="run.ts" />

      <DocCallout type="note">
        <InlineCode>run()</InlineCode> returns either a <InlineCode>RunResult</InlineCode> (when
        the loop completes normally) or a <InlineCode>HITLPause</InlineCode> (when a tool with{" "}
        <InlineCode>requiresApproval: true</InlineCode> was triggered). Always check with{" "}
        <InlineCode>isHITLPause(result)</InlineCode> before reading the result.
      </DocCallout>

      <DocH2>Streaming with runStream()</DocH2>
      <DocP>
        Use <InlineCode>runStream()</InlineCode> instead of <InlineCode>run()</InlineCode> to
        receive events as they happen. This is useful for streaming text to the user in real-time,
        showing tool call progress, or building reactive UIs.
      </DocP>
      <CodeBlock className="mt-4" code={STREAM_CODE} language="typescript" filename="stream.ts" />

      <DocP>
        The generator yields <InlineCode>RunStreamEvent</InlineCode> objects. The possible event
        types are: <InlineCode>chunk</InlineCode>, <InlineCode>tool_start</InlineCode>,{" "}
        <InlineCode>tool_end</InlineCode>, <InlineCode>handoff</InlineCode>,{" "}
        <InlineCode>step_complete</InlineCode>, <InlineCode>hitl_pause</InlineCode>, and{" "}
        <InlineCode>done</InlineCode>.
      </DocP>

      <DocCallout type="tip">
        The <InlineCode>done</InlineCode> event is always emitted last. Its{" "}
        <InlineCode>event.result</InlineCode> is the complete <InlineCode>RunResult</InlineCode> —
        the same object you would get from a non-streaming <InlineCode>run()</InlineCode> call.
      </DocCallout>
    </DocPage>
  );
}
