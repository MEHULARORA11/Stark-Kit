// src/types/message.ts

export type Role = "system" | "developer" | "user" | "assistant" | "tool";

/**
 * The simple shape a caller passes in when kicking off a run,
 * e.g. run({ messages: [{ role: "user", content: "..." }] }).
 * This is intentionally provider-agnostic and dumb.
 */
export interface IMessage {
  role: "user" | "system" | "developer";
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface ToolResultPayload {
  toolCallId: string;
  toolName: string;
  content: string;
  isError?: boolean;
}

export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  toolCalls?: ToolCall[];
}

export interface ToolResultMessage {
  role: "tool";
  result: ToolResultPayload;
}

/**
 * The canonical, provider-agnostic conversation shape used internally
 * by run(). Nothing OpenAI/Anthropic/Gemini-specific ever leaks into this.
 * Each Provider's own Mapper is responsible for translating this into
 * (and out of) its SDK's native message format.
 */
export type CanonicalMessage = IMessage | AssistantMessage | ToolResultMessage;