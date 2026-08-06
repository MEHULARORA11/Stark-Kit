// Barrel exports for Stark-Kit

export type {
  Role,
  IMessage,
  ToolCall,
  ToolResultPayload,
  AssistantMessage,
  ToolResultMessage,
  CanonicalMessage,
} from "./types/message.js";

export type { IToolOptions, ToolResult } from "./types/tools.js";
export { isToolResult } from "./types/tools.js";

export type { IAgentOptions, AgentHooks } from "./types/agent.js";

export { Agent } from "./agent/agent.js";
export { defineTool } from "./agent/tool.js";

export { run, runStream, resumeRun, isHITLPause } from "./agent/run.js";
export type {
  RunOptions,
  RunResult,
  RunResultOrPause,
  HITLPause,
  HITLDecision,
  PendingToolCall,
  RunStreamEvent,
} from "./agent/run.js";

export { createHandoffTool, isHandoffResult } from "./agent/handoff.js";
export type { HandoffResult } from "./agent/handoff.js";

export type {
  Provider,
  AIResponse,
  ChatOptions,
  StreamChunk,
} from "./provider/provider.js";

export { OpenAIProvider } from "./provider/openai/OpenAIProvider.js";
export { ClaudeProvider } from "./provider/claude/ClaudeProvider.js";
export { GeminiProvider } from "./provider/gemini/GeminiProvider.js";
export { MistralProvider } from "./provider/mistral/MistralProvider.js";

export { OpenAIMapper } from "./provider/openai/OpenAIMapper.js";
export { ClaudeMapper } from "./provider/claude/ClaudeMapper.js";
export { GeminiMapper } from "./provider/gemini/GeminiMapper.js";
export { MistralMapper } from "./provider/mistral/MistralMapper.js";

export { config, getEnv } from "./utils/config.js";