# Stark-Kit 🛡️

Stark-Kit is a lightweight, strictly typed, and provider-agnostic TypeScript framework for building AI agents. Write your agentic loops once and run them on OpenAI, Claude, Gemini, or Mistral without changing your core application logic.

## Why Stark-Kit?

Most agent frameworks tightly couple your business logic to a specific provider's SDK, making switching models or providers tedious. Stark-Kit addresses this by introducing a provider-agnostic execution model centered around a unified `CanonicalMessage` interface.

Key features include:
*   **Strictly Typed Tools:** Tools are defined with runtime schema validation via Zod.
*   **Real-Time Streaming:** Seamlessly stream text chunks, tool calls, and execution states to build responsive user interfaces.
*   **Lifecycle Hooks:** Intercept, sanitize, or block LLM calls and tool inputs/outputs.
*   **Human-in-the-Loop (HITL):** Pause execution to obtain approval or modify arguments before running sensitive tools.
*   **Agent Handoffs:** Route conversations between specialized agents to create multi-agent networks.
*   **Structured Outputs:** Enforce structured JSON replies by binding agents to a Zod schema.

---

## Architecture

Stark-Kit relies on three main components to keep vendor logic separate from your agent code:

1.  **The Agent:** Defines instructions (system prompt), available tools, runtime parameters (e.g. temperature), lifecycle hooks, and target output schemas.
2.  **The Provider:** A standard interface implemented by each LLM adapter (OpenAI, Anthropic, Gemini, Mistral). The provider maps Stark-Kit's internal message structure (`CanonicalMessage`) to the provider's native format and returns unified responses.
3.  **The Run Loop (`run` / `runStream`):** The orchestrator that executes the agent's logic. It manages message history, handles tool calls, coordinates human-in-the-loop pauses, runs lifecycle hooks, and transitions between agents during handoffs.

---

## Quick Start

### Installation

```bash
bun add @mehularora/stark-kit zod
```

### Basic Agent

```typescript
import "dotenv/config";
import { Agent, run, defineTool, ClaudeProvider } from "@mehularora/stark-kit";
import z from "zod";

// Initialize a provider (keys are automatically read from environment variables)
const provider = new ClaudeProvider();

// Define a tool with typed inputs
const weatherTool = defineTool({
  name: "getWeather",
  description: "Get the current weather for a city.",
  parameters: z.object({
    city: z.string().describe("The name of the city, e.g. Tokyo"),
  }),
  execute: async ({ city }) => {
    return `The weather in ${city} is sunny and 22°C.`;
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
}
```

---

## Patterns & Examples

### 1. Streaming

Use `runStream` to handle incremental text deltas and execution lifecycle events as they occur.

```typescript
import "dotenv/config";
import { runStream } from "@mehularora/stark-kit";

const stream = runStream({
  agent,
  messages: "Tell me a short story and fetch the weather in Paris.",
});

for await (const event of stream) {
  switch (event.type) {
    case "chunk":
      if (event.chunk.type === "text") {
        process.stdout.write(event.chunk.delta);
      }
      break;
    case "tool_start":
      console.log(`\n[Executing: ${event.toolName}]`);
      break;
    case "tool_end":
      console.log(`[Completed: ${event.toolName}]`);
      break;
    case "done":
      console.log("\n\nFinal Answer:", event.result.content);
      break;
  }
}
```

### 2. Standardized Tool Outputs (`ToolResult`)

By returning a structured `ToolResult` inside a tool execution, you can report errors back to the model for graceful recovery and self-correction instead of throwing runtime errors.

```typescript
import "dotenv/config";
import { defineTool, ToolResult } from "@mehularora/stark-kit";
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
      // The LLM receives this error message and attempts to self-correct its query
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  },
});
```

### 3. Lifecycle Hooks (Guardrails)

Inject behavior before LLM generations, before tool runs, or after execution to sanitize input data, redact secrets, or intercept system commands.

```typescript
const agent = new Agent({
  name: "SecureAgent",
  provider,
  instructions: "Handle system lookups.",
  hooks: {
    // Sanitize user prompt history before invoking the LLM
    beforeChat: async (history) => {
      return history.map(msg => ({
        ...msg,
        content: msg.content ? msg.content.replace(/api_key=\w+/g, "api_key=REDACTED") : null
      }));
    },
    // Block executions or modify arguments before tool execution
    beforeTool: async (toolName, args) => {
      if (toolName === "deleteDir" && (args as any).path.startsWith("/root")) {
        throw new Error("Permission Denied: Cannot delete root files.");
      }
    },
    // Sanitize tool response contents before sending them to the LLM
    afterTool: async (toolName, result, isError) => {
      return result.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "***-**-****");
    }
  }
});
```

### 4. Human-in-the-Loop (HITL)

Mark tools with `requiresApproval: true` to yield a `requires_action` pause state. Resume the loop after approval, rejection, or argument modification.

```typescript
import "dotenv/config";
import { isHITLPause, resumeRun, defineTool } from "@mehularora/stark-kit";
import z from "zod";

const sendEmailTool = defineTool({
  name: "sendEmail",
  description: "Send an email notification.",
  requiresApproval: true,
  parameters: z.object({ to: z.string(), body: z.string() }),
  execute: async ({ to, body }) => `Email sent to ${to}.`
});

const agent = new Agent({ name: "Notifier", provider, instructions: "...", tools: [sendEmailTool] });
let result = await run({ agent, messages: "Email updates to user@example.com" });

if (isHITLPause(result)) {
  console.log("Pending Approval for:", result.pendingToolCalls);
  
  // Resume the loop using the tool call ID
  result = await resumeRun(result, {
    [result.pendingToolCalls[0].toolCallId]: { action: "approve" }
    // Or reject: { action: "reject", reason: "Blocked by admin" }
    // Or modify arguments: { action: "modify", modifiedArgs: { to: "user@example.com", body: "Cleaned content" } }
  });
}
```

### 5. Swarm Handoffs

Set up multi-agent networks by allowing agents to transfer execution to one another dynamically.

```typescript
import "dotenv/config";
import { Agent, run, createHandoffTool } from "@mehularora/stark-kit";

const billingAgent = new Agent({ name: "BillingAgent", provider, instructions: "Process refunds." });
const supportAgent = new Agent({ name: "SupportAgent", provider, instructions: "Resolve technical errors." });

const triageAgent = new Agent({
  name: "TriageAgent",
  provider,
  instructions: "Determine intent and route the customer inquiry.",
  tools: [
    createHandoffTool(billingAgent),
    createHandoffTool(supportAgent)
  ]
});

const response = await run({
  agent: triageAgent,
  messages: "I need a refund for my last transaction.",
});

console.log(response.agent.name); // "BillingAgent"
console.log(response.content);    // Answer provided by BillingAgent
```

### 6. Structured Outputs (`outputType`)

Provide a Zod schema to force the agent to respond with structured JSON. Stark-Kit sets up the schema constraints and auto-injects final submission logic.

```typescript
import "dotenv/config";
import { Agent, run } from "@mehularora/stark-kit";
import z from "zod";

const OutputSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  topics: z.array(z.string()),
});

const analyzer = new Agent({
  name: "Analyzer",
  provider,
  instructions: "Extract sentiment and topics.",
  outputType: OutputSchema,
});

const result = await run({
  agent: analyzer,
  messages: "I hate waiting in long lines at the store. It is extremely annoying.",
});

if (result.status === "complete") {
  console.log(result.finalOutput); // { sentiment: "negative", topics: ["long lines", "store"] }
}
```

---

## API Reference

### `Agent` Configuration

```typescript
import { Agent } from "@mehularora/stark-kit";

const agent = new Agent({
  name: "AgentName",
  instructions: "System prompt instructions.",
  provider: providerInstance,
  tools: [],             // Optional
  maxSteps: 10,          // Optional
  temperature: 0.7,      // Optional
  model: "model-name",   // Optional override
  hooks: {},             // Optional hooks
  outputType: zSchema    // Optional structured output schema
});
```

### `defineTool` Signature

```typescript
import { defineTool } from "@mehularora/stark-kit";

const tool = defineTool({
  name: "tool_name",
  description: "When to use it.",
  parameters: z.object({ ... }),
  execute: async (args) => { ... },
  requiresApproval: false
});
```

### `run` & `runStream` Options

```typescript
import { run, runStream } from "@mehularora/stark-kit";

const result = await run({
  agent: agentInstance,
  messages: "User input query", // Or CanonicalMessage[]
  maxSteps: 10,
  model: "override-model-name",
  temperature: 0.5
});
```

---

## Supported Providers

Stark-Kit reads standard provider keys from environment variables.

| Provider | Adapter Class | Environment Variable | Default Model |
| :--- | :--- | :--- | :--- |
| OpenAI | `OpenAIProvider` | `OPENAI_API_KEY` | `gpt-4o` |
| Anthropic | `ClaudeProvider` | `ANTHROPIC_API_KEY` | `claude-3-5-sonnet-latest` |
| Google | `GeminiProvider` | `GEMINI_API_KEY` | `gemini-1.5-flash` |
| Mistral | `MistralProvider` | `MISTRAL_API_KEY` | `mistral-large-latest` |

### Custom Provider Adapter

Create custom providers by implementing the `Provider` interface:

```typescript
import { Provider, ChatOptions, AIResponse, StreamChunk } from "@mehularora/stark-kit";
import { CanonicalMessage } from "@mehularora/stark-kit/types/message";

export class MyCustomProvider implements Provider {
  name = "custom-llm";
  defaultModel = "my-llm-v1";

  async chat(messages: CanonicalMessage[], options: ChatOptions): Promise<AIResponse> {
    // API request execution logic
  }

  async *chatStream(messages: CanonicalMessage[], options: ChatOptions): AsyncGenerator<StreamChunk, AIResponse> {
    // Streaming execution logic
  }
}
```

---

## License

MIT License. Created by [Mehul Arora](https://www.mehularora.dev).
