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
  title: "Structured Outputs",
  description:
    "Force your agents to respond with strict JSON matching a Zod schema.",
};

const STRUCTURED_OUTPUT_CODE = `import "dotenv/config";
import { Agent, run, OpenAIProvider } from "@mehularora/stark-kit";
import z from "zod";

const provider = new OpenAIProvider();

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

export default function StructuredOutputsPage() {
  return (
    <DocPage>
      <DocH1>Structured Outputs</DocH1>
      <DocLead>
        Pass a Zod schema to the <InlineCode>outputType</InlineCode> option and Stark-Kit auto-configures the agent to return structured JSON.
      </DocLead>

      <DocH2>How it works</DocH2>
      <DocP>
        When you provide a Zod schema to an Agent's <InlineCode>outputType</InlineCode>, Stark-Kit converts it to a JSON schema and injects it into the system prompt. It also automatically defines a <InlineCode>submit_final_output</InlineCode> tool behind the scenes. The model is forced to call this tool to complete its run, ensuring the output strictly adheres to your required shape.
      </DocP>
      <CodeBlock className="mt-4" code={STRUCTURED_OUTPUT_CODE} language="typescript" filename="structured.ts" />

      <DocH3>Accessing the typed output</DocH3>
      <DocP>
        When an agent has <InlineCode>outputType</InlineCode> set, the final result contains a{" "}
        <InlineCode>finalOutput</InlineCode> property typed correctly as{" "}
        <InlineCode>z.infer&lt;typeof YourSchema&gt;</InlineCode>. The regular{" "}
        <InlineCode>result.content</InlineCode> string will also contain the JSON representation.
      </DocP>

      <DocCallout type="tip">
        Structured outputs and tools can be combined on the same agent. The model can call tools
        freely during its reasoning steps and then submit the final structured answer when it's done.
      </DocCallout>
    </DocPage>
  );
}
