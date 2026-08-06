export type Role = "system" | "developer" | "user" | "assistant" | "tool";

// Simple message shape passed in by the caller.
export interface IMessage {
  role: "user" | "system" | "developer";
  content: string;
}

// Represents a requested tool call.
export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

// Payload details representing the output result of a tool.
export interface ToolResultPayload {
  toolCallId: string;
  toolName: string;
  content: string;
  isError?: boolean;
}

// Message representing assistant response containing text and tool calls.
export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  toolCalls?: ToolCall[];
}

// Message representing the output result from a tool.
export interface ToolResultMessage {
  role: "tool";
  result: ToolResultPayload;
}

export type CanonicalMessage = IMessage | AssistantMessage | ToolResultMessage;