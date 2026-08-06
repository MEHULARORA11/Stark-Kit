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
  title: "Human-in-the-Loop",
  description:
    "Pause execution before running sensitive tools and resume after human approval, rejection, or argument modification.",
};

const DEFINE_TOOL_CODE = `import "dotenv/config";
import { defineTool, Agent, run, isHITLPause, resumeRun, GeminiProvider } from "@mehularora/stark-kit";
import z from "zod";

const provider = new GeminiProvider();

// Mark this tool as requiring approval before it executes
const sendEmailTool = defineTool({
  name: "sendEmail",
  description: "Send an email notification to a recipient.",
  requiresApproval: true,          // ← the key flag
  parameters: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    // This only runs if the human approves
    return \`Email sent to \${to} with subject "\${subject}".\`;
  },
});`;

const RUN_CODE = `const agent = new Agent({
  name: "Notifier",
  provider,
  instructions: "Draft and send email notifications when asked.",
  tools: [sendEmailTool],
});

let result = await run({
  agent,
  messages: "Send a welcome email to alice@example.com",
});`;

const INSPECT_CODE = `import { isHITLPause } from "@mehularora/stark-kit";

if (isHITLPause(result)) {
  console.log("Run paused. Pending tool calls:");

  for (const call of result.pendingToolCalls) {
    console.log("  Tool:", call.toolName);
    console.log("  Args:", call.args);
    console.log("  ID:  ", call.toolCallId);
  }
}`;

const APPROVE_CODE = `import { resumeRun } from "@mehularora/stark-kit";

// Resume with approval — the tool executes as-is
result = await resumeRun(result, {
  [result.pendingToolCalls[0].toolCallId]: { action: "approve" },
});

if (result.status === "complete") {
  console.log(result.content);
}`;

const REJECT_CODE = `// Resume with rejection — the tool is not executed
// The model receives the rejection reason and can respond accordingly
result = await resumeRun(result, {
  [result.pendingToolCalls[0].toolCallId]: {
    action: "reject",
    reason: "This recipient is not on the approved list.",
  },
});`;

const MODIFY_CODE = `// Resume with modified arguments — tool runs with new args
result = await resumeRun(result, {
  [result.pendingToolCalls[0].toolCallId]: {
    action: "modify",
    modifiedArgs: {
      to: "alice@example.com",
      subject: "Welcome to the platform",
      body: "Hi Alice, welcome! [reviewed and approved by admin]",
    },
  },
});`;

const MULTI_HITL_CODE = `// Multiple pending tool calls — handle each by its toolCallId
if (isHITLPause(result)) {
  const decisions: Record<string, { action: string }> = {};

  for (const call of result.pendingToolCalls) {
    // Your approval UI determines the decision per call
    decisions[call.toolCallId] = { action: "approve" };
  }

  result = await resumeRun(result, decisions);
}`;

export default function HITLPage() {
  return (
    <DocPage>
      <DocH1>Human-in-the-Loop</DocH1>
      <DocLead>
        Mark any tool with <InlineCode>requiresApproval: true</InlineCode> and the run loop will
        pause before executing it — giving you a chance to inspect the arguments, approve, reject,
        or modify them before proceeding.
      </DocLead>

      <DocH2>Defining an approval-gated tool</DocH2>
      <DocP>
        Set <InlineCode>requiresApproval: true</InlineCode> on any <InlineCode>defineTool()</InlineCode>{" "}
        call. The tool's <InlineCode>execute</InlineCode> function will only run if the human
        approves the pending call.
      </DocP>
      <CodeBlock className="mt-4" code={DEFINE_TOOL_CODE} language="typescript" filename="hitl.ts" />

      <DocH2>Running an agent with HITL tools</DocH2>
      <DocP>
        The API is identical to a normal <InlineCode>run()</InlineCode> call. The difference is in
        how you handle the result.
      </DocP>
      <CodeBlock className="mt-4" code={RUN_CODE} language="typescript" />

      <DocH2>Detecting a pause</DocH2>
      <DocP>
        Use the type guard <InlineCode>isHITLPause(result)</InlineCode> to check whether the run
        loop stopped for human approval. The returned object contains{" "}
        <InlineCode>pendingToolCalls</InlineCode> — an array of the tool invocations that need
        review.
      </DocP>
      <CodeBlock className="mt-4" code={INSPECT_CODE} language="typescript" />

      <DocH2>Resuming the loop</DocH2>
      <DocP>
        Call <InlineCode>resumeRun(pause, decisions)</InlineCode> to continue execution. The
        decisions map is keyed by <InlineCode>toolCallId</InlineCode> and each entry specifies an{" "}
        <InlineCode>action</InlineCode>.
      </DocP>

      <DocH3>Approve</DocH3>
      <DocP>
        The tool executes with exactly the arguments the model chose. This is the default happy path.
      </DocP>
      <CodeBlock className="mt-4" code={APPROVE_CODE} language="typescript" />

      <DocH3>Reject</DocH3>
      <DocP>
        The tool does not execute. The optional <InlineCode>reason</InlineCode> is passed back to the
        model so it can respond to the user accordingly — for example, explaining why the action was
        blocked.
      </DocP>
      <CodeBlock className="mt-4" code={REJECT_CODE} language="typescript" />

      <DocH3>Modify arguments</DocH3>
      <DocP>
        The tool executes, but with your <InlineCode>modifiedArgs</InlineCode> instead of the model's
        original arguments. This lets you fix typos, enforce data policies, or add mandatory fields
        before the tool runs.
      </DocP>
      <CodeBlock className="mt-4" code={MODIFY_CODE} language="typescript" />

      <DocH2>Multiple pending tool calls</DocH2>
      <DocP>
        If the model requested several tool calls at once and all have{" "}
        <InlineCode>requiresApproval: true</InlineCode>, all of them appear in{" "}
        <InlineCode>pendingToolCalls</InlineCode>. Provide a decision for each{" "}
        <InlineCode>toolCallId</InlineCode> in a single <InlineCode>resumeRun()</InlineCode> call.
      </DocP>
      <CodeBlock className="mt-4" code={MULTI_HITL_CODE} language="typescript" />

      <DocCallout type="note">
        <InlineCode>resumeRun()</InlineCode> returns the same union type as{" "}
        <InlineCode>run()</InlineCode>: either a <InlineCode>RunResult</InlineCode> or another{" "}
        <InlineCode>HITLPause</InlineCode> (if further tools with{" "}
        <InlineCode>requiresApproval</InlineCode> are triggered downstream). Always check with{" "}
        <InlineCode>isHITLPause()</InlineCode> again after resuming.
      </DocCallout>

      <DocCallout type="tip">
        HITL works seamlessly with <InlineCode>runStream()</InlineCode> too. The stream emits a{" "}
        <InlineCode>hitl_pause</InlineCode> event instead of stopping silently — inspect{" "}
        <InlineCode>event.result</InlineCode> (a <InlineCode>HITLPause</InlineCode>) and call{" "}
        <InlineCode>resumeRun()</InlineCode> on it.
      </DocCallout>
    </DocPage>
  );
}
