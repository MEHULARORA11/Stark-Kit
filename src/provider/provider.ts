import type { IToolOptions } from "../types/tools.js";
import type { CanonicalMessage, ToolCall } from "../types/message.js";

// Represents a provider response containing text content or tool calls.
export interface AIResponse {
  content: string | null;
  toolCalls?: ToolCall[];
}

// Configurable options for the chat model requests.
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  toolChoice?: "auto" | "required" | { type: "function"; name: string };
}

export type StreamChunk =
  | { type: "text"; delta: string }
  | { type: "tool_call"; id: string; name: string; argsDelta: string }
  | { type: "tool_call_done"; id: string; name: string; args: unknown }
  | { type: "done"; response: AIResponse };

// Interface definition for implementing an LLM provider adapter.
export interface Provider {
  name: string;

  // Sends conversation history and tools to the LLM and returns the unified response.
  chat(
    history: CanonicalMessage[],
    tools: IToolOptions[],
    options?: ChatOptions
  ): Promise<AIResponse>;

  // Sends conversation history and tools to the LLM and yields streaming chunks.
  chatStream?(
    history: CanonicalMessage[],
    tools: IToolOptions[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;
}