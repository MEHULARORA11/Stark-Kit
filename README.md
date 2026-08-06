# Stark-Kit 🛡️

[![NPM Version](https://img.shields.io/npm/v/stark-kit?color=blue&style=flat-square)](https://www.npmjs.com/package/stark-kit)
[![License](https://img.shields.io/github/license/MEHULARORA11/Stark-Kit?style=flat-square&color=green)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/MEHULARORA11/Stark-Kit/build.yml?style=flat-square&label=build)](https://github.com/MEHULARORA11/Stark-Kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](tsconfig.json)

**Stark-Kit** is a lightweight, strictly typed, and completely provider-agnostic TypeScript framework for building powerful, reliable AI agents. 

Write your agentic loops once. Run them on OpenAI, Anthropic (Claude), Google (Gemini), or Mistral seamlessly without changing your core logic.

---

## 🌟 Key Features

*   🔌 **Provider-Agnostic Core:** Decouple your business logic from specific provider SDKs using a unified `CanonicalMessage` interface.
*   🛡️ **Strictly Typed Tools:** Register and execute tools with schema validation powered by [Zod](https://zod.dev/).
*   ⚡ **Real-Time Streaming:** Seamlessly yield text deltas, tool events, and transition states for highly responsive user interfaces.
*   🚦 **Lifecycle Guardrails:** Intercept, sanitize, or block LLM calls and tool inputs/outputs using async hook filters.
*   🛑 **Human-in-the-Loop (HITL):** Pause execution flow for sensitive tools, request human approval or parameters adjustment, and resume smoothly.
*   🐝 **Agent Handoff (Swarm Orchestration):** Route complex user prompts dynamically between specialized sub-agents.
*   📐 **Structured Outputs:** Force agents to respond strictly matching a Zod schema via automatic output tool injection.

---

## 🏗️ Architecture

Stark-Kit decouples the runtime engine from vendor-specific APIs:

```mermaid
graph TD
    User([User Input]) --> RunLoop[Agentic Run Loop<br/>run / runStream]
    
    subgraph Stark-Kit Core
        RunLoop <--> History[(Canonical History)]
        RunLoop --> Guardrails{Guardrail Hooks}
        RunLoop --> Tools((Tools))
        RunLoop --> HITL{HITL Pause}
    end
    
    RunLoop <--> Provider[Provider Interface]
    
    subgraph Providers
        Provider <--> OpenAI[OpenAI Mapper]
        Provider <--> Claude[Claude Mapper]
        Provider <--> Gemini[Gemini Mapper]
        Provider <--> Mistral[Mistral Mapper]
    end
    
    OpenAI <--> OAI_API((OpenAI API))
    Claude <--> Anthropic_API((Anthropic API))
    Gemini <--> Gemini_API((Gemini API))
    Mistral <--> Mistral_API((Mistral API))
```

---

## 🚀 Quick Start

### Installation

Install `stark-kit` along with `zod`:

```bash
bun add stark-kit zod
# Or use npm, yarn, or pnpm
# npm install stark-kit zod
```

### Basic Agent Example

```typescript
import { Agent, run, defineTool, ClaudeProvider } from "stark-kit";
import z from "zod";

// 1. Initialize your preferred provider (API keys loaded via env automatically)
const provider = new ClaudeProvider();

// 2. Define a typed tool with schema validation
const weatherTool = defineTool({
  name: "getWeather",
  description: "Get the current weather for a city.",
  parameters: z.object({
    city: z.string().describe("The exact name of the city, e.g. Tokyo"),
  }),
  execute: async ({ city }) => {
    return `The weather in ${city} is sunny and 22°C.`;
  },
});

// 3. Configure the Agent
const agent = new Agent({
  name: "WeatherBot",
  provider,
  instructions: "You are a helpful weather assistant. Keep responses brief.",
  tools: [weatherTool],
});

// 4. Execute the loop
const response = await run({
  agent,
  messages: "What's the weather like in Tokyo?",
});

if (response.status === "complete") {
  console.log(response.content); // "The weather in Tokyo is sunny and 22°C."
}
```

---

## 🧠 Advanced Agentic Patterns

### 1. Real-Time Streaming (`runStream`)

Yield text chunks and lifecycle events (e.g. tool execution status) in real time to build highly interactive UIs.

```typescript
import { runStream } from "stark-kit";

const stream = runStream({
  agent,
  messages: "Tell me a joke and search the weather in Paris.",
});

for await (const event of stream) {
  switch (event.type) {
    case "chunk":
      if (event.chunk.type === "text") {
        process.stdout.write(event.chunk.delta);
      }
      break;
    case "tool_start":
      console.log(`\n[Tool Executing: ${event.toolName}]`);
      break;
    case "tool_end":
      console.log(`[Tool Finished: ${event.toolName} -> success=${!event.isError}]`);
      break;
    case "done":
      console.log("\n\nFinal Answer:", event.result.content);
      break;
  }
}
```

### 2. Standardized Tool Outputs (`ToolResult`)

Wrap tool returns in a structured `ToolResult` to handle errors gracefully. Instead of crashing, Stark-Kit detects failures and feeds the error back to the LLM, enabling self-correction.

```typescript
import { defineTool, ToolResult } from "stark-kit";

const databaseTool = defineTool({
  name: "queryDB",
  description: "Query the system database.",
  parameters: z.object({ sql: z.string() }),
  execute: async ({ sql }): Promise<ToolResult> => {
    try {
      const data = await db.execute(sql);
      return { success: true, data };
    } catch (err) {
      // The LLM receives this error description and will attempt to rewrite its SQL!
      return { 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  },
});
```

### 3. Guardrail Hooks

Hook into key lifecycle events to inspect, sanitize, modify, or block inputs and outputs.

```typescript
const secureAgent = new Agent({
  name: "SecureAgent",
  provider,
  instructions: "You are a secure system assistant.",
  hooks: {
    // Intercept and sanitize history before calling the LLM
    beforeChat: async (history) => {
      // e.g. Redact user PII
      return history.map(msg => ({
        ...msg,
        content: msg.content ? msg.content.replace(/SSN:\s*\d{3}-\d{2}-\d{4}/g, "SSN: ***-**-****") : null
      }));
    },
    // Block or modify arguments before tool execution
    beforeTool: async (toolName, args) => {
      if (toolName === "deleteFile" && (args as any).path.includes("/etc")) {
        throw new Error("Access Denied: Cannot modify system directories.");
      }
    },
    // Sanitize output returned by a tool before the LLM sees it
    afterTool: async (toolName, result, isError) => {
      if (toolName === "fetchUserData") {
        return result.replace(/password=\w+/g, "password=REDACTED");
      }
    }
  }
});
```

### 4. Human-in-the-Loop (HITL)

Sensitive tools can be configured to pause the run loop. The developer can inspect details, approve, reject, or modify the arguments before resuming.

```typescript
import { isHITLPause, resumeRun, defineTool } from "stark-kit";

const transferFundsTool = defineTool({
  name: "transferFunds",
  description: "Transfer money to another account.",
  requiresApproval: true, // 🛑 Pauses the loop
  parameters: z.object({ amount: z.number(), to: z.string() }),
  execute: async ({ amount, to }) => {
    return `Successfully transferred $${amount} to ${to}.`;
  }
});

const agent = new Agent({ name: "BankAgent", provider, instructions: "...", tools: [transferFundsTool] });
let result = await run({ agent, messages: "Transfer $500 to Bob" });

if (isHITLPause(result)) {
  console.log("Pending Approval for:", result.pendingToolCalls);
  // pendingToolCalls = [{ toolCallId: "call_abc", toolName: "transferFunds", args: { amount: 500, to: "Bob" } }]
  
  // Resume loop by providing a decision for each pending tool call ID
  result = await resumeRun(result, {
    "call_abc": { action: "approve" } 
    // Other decisions you can supply:
    // "call_abc": { action: "reject", reason: "Unauthorized limit exceeded" }
    // "call_abc": { action: "modify", modifiedArgs: { amount: 100, to: "Bob" } }
  });
}
```

### 5. Multi-Agent Swarms & Handoffs

Build Swarm-style agent architectures where a triage agent routes conversation flow to specialized agents dynamically.

```typescript
import { Agent, run, createHandoffTool } from "stark-kit";

const billingAgent = new Agent({ name: "BillingAgent", provider, instructions: "Handle refunds." });
const techAgent = new Agent({ name: "TechAgent", provider, instructions: "Solve technical issues." });

const triageAgent = new Agent({
  name: "TriageAgent",
  provider,
  instructions: "Determine the user's intent and route to the correct agent.",
  tools: [
    createHandoffTool(billingAgent), // registers "transfer_to_BillingAgent"
    createHandoffTool(techAgent)     // registers "transfer_to_TechAgent"
  ]
});

// Stark-Kit automatically swaps the active agent, imports history, and continues execution.
const response = await run({
  agent: triageAgent,
  messages: "I need a refund for my order.",
});

console.log(response.agent.name); // "BillingAgent"
console.log(response.content);    // Final response from BillingAgent
```

### 6. Typed Structured Outputs (`outputType`)

Set `outputType` to enforce that your agent returns data matching a Zod schema. Stark-Kit injects a validator tool and forces the agent to use it, preventing arbitrary text formats.

```typescript
import { Agent, run } from "stark-kit";
import z from "zod";

const UserProfileSchema = z.object({
  name: z.string(),
  age: z.number(),
  interests: z.array(z.string()),
});

const profileAgent = new Agent({
  name: "ProfileBuilder",
  provider,
  instructions: "Parse the user message into a profile.",
  outputType: UserProfileSchema,
});

const result = await run({
  agent: profileAgent,
  messages: "I am John Doe, 29 years old. I love coding, hiking, and playing chess.",
});

if (result.status === "complete") {
  console.log(result.finalOutput);
  // Output: { name: "John Doe", age: 29, interests: ["coding", "hiking", "playing chess"] }
}
```

---

## 📖 API Reference

### `Agent` Class

The primary orchestration class containing instructions, configurations, and tools.

```typescript
import { Agent } from "stark-kit";

const agent = new Agent(options: IAgentOptions);
```

#### `IAgentOptions`

| Option | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `name` | `string` | Yes | The name of the agent. Used for identification and handoffs. |
| `instructions` | `string` | Yes | The agent's system prompt containing behaviors and rules. |
| `provider` | `Provider` | Yes | An instance of an LLM provider (e.g. `ClaudeProvider`). |
| `tools` | `IToolOptions[]` | No | An array of tools the agent can execute. |
| `maxSteps` | `number` | No | Prevents run loops from running indefinitely (Default: `10`). |
| `temperature` | `number` | No | Temperature setting for the model (typically `0.0` to `2.0`). |
| `model` | `string` | No | Override the provider's default model for this agent. |
| `hooks` | `AgentHooks` | No | Pre and post lifecycle filters for guardrails. |
| `outputType` | `z.ZodType` | No | Zod schema used to enforce structured response output. |

---

### `defineTool` Function

Registers a typed tool that can be understood by the LLM and validated at runtime.

```typescript
import { defineTool } from "stark-kit";

const tool = defineTool(options: IToolOptions);
```

#### `IToolOptions`

| Option | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `name` | `string` | Yes | Name of the tool. Must be alphanumeric (underscores allowed). |
| `description` | `string` | Yes | Clear instruction describing when and how to call the tool. |
| `parameters` | `z.ZodType` | Yes | A Zod schema defining the expected arguments. |
| `execute` | `(args) => Promise<any>` | Yes | The execution logic. Can return a raw value or a `ToolResult`. |
| `requiresApproval`| `boolean` | No | Marks the tool as requiring human approval (HITL). |

---

### `run` & `runStream` Functions

Kicks off the agentic loop.

```typescript
import { run, runStream } from "stark-kit";

// Standard run
const result = await run(options: RunOptions);

// Streaming run
const stream = runStream(options: RunOptions);
```

#### `RunOptions`

| Option | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `agent` | `Agent` | Yes | The initial agent that starts the loop. |
| `messages` | `IMessage[] \| string`| Yes | Initial prompt string or a list of messages. |
| `maxSteps` | `number` | No | Override default agent limit for steps in this run. |
| `model` | `string` | No | Override the model for this execution. |
| `temperature` | `number` | No | Override the temperature for this execution. |

---

## 🔌 Supported Providers

Stark-Kit automatically reads environment variables if left unconfigured in code.

| Provider | Import | Env Variable | Default Model |
| :--- | :--- | :--- | :--- |
| **OpenAI** | `OpenAIProvider` | `OPENAI_API_KEY` | `gpt-4o` |
| **Anthropic** | `ClaudeProvider` | `ANTHROPIC_API_KEY` | `claude-3-5-sonnet-latest` |
| **Google** | `GeminiProvider` | `GEMINI_API_KEY` | `gemini-1.5-flash` |
| **Mistral** | `MistralProvider`| `MISTRAL_API_KEY` | `mistral-large-latest` |

### Custom Providers

To create a custom provider adapter, implement the `Provider` interface:

```typescript
import { Provider, ChatOptions, AIResponse, StreamChunk } from "stark-kit";
import { CanonicalMessage } from "stark-kit/types/message";

export class CustomLLMProvider implements Provider {
  name = "custom-provider";
  defaultModel = "my-custom-model";

  async chat(
    messages: CanonicalMessage[],
    options: ChatOptions
  ): Promise<AIResponse> {
    // Call custom API and return unified format
  }

  async *chatStream(
    messages: CanonicalMessage[],
    options: ChatOptions
  ): AsyncGenerator<StreamChunk, AIResponse, unknown> {
    // Yield text chunks
  }
}
```

---

## 📜 License

MIT License. Created by [Mehul Arora](https://www.mehularora.dev).
