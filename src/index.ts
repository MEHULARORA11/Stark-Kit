// src/index.ts — Barrel exports for Stark-Kit

// ── Types: Messages ───────────────────────────────────────────────────
export type {
  Role,
  IMessage,
  ToolCall,
  ToolResultPayload,
  AssistantMessage,
  ToolResultMessage,
  CanonicalMessage,
} from "./types/message.js";

// ── Types: Tools ──────────────────────────────────────────────────────
export type { IToolOptions, ToolResult } from "./types/tools.js";
export { isToolResult, buildToolDescription } from "./types/tools.js";

// ── Types: Agent ──────────────────────────────────────────────────────
export type { IAgentOptions, AgentHooks } from "./types/agent.js";

// ── Agent ─────────────────────────────────────────────────────────────
export { Agent } from "./agent/agent.js";
export { defineTool } from "./agent/tool.js";

// ── Run Loop ──────────────────────────────────────────────────────────
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

// ── Handoff / Orchestration ───────────────────────────────────────────
export { createHandoffTool, isHandoffResult } from "./agent/handoff.js";
export type { HandoffResult } from "./agent/handoff.js";

// ── Provider Interface ────────────────────────────────────────────────
export type {
  Provider,
  AIResponse,
  ChatOptions,
  StreamChunk,
} from "./provider/provider.js";

// ── Provider Implementations ──────────────────────────────────────────
export { OpenAIProvider } from "./provider/openai/OpenAIProvider.js";
export { ClaudeProvider } from "./provider/claude/ClaudeProvider.js";
export { GeminiProvider } from "./provider/gemini/GeminiProvider.js";
export { MistralProvider } from "./provider/mistral/MistralProvider.js";

// ── Mappers (for advanced use / custom providers) ─────────────────────
export { OpenAIMapper } from "./provider/openai/OpenAIMapper.js";
export { ClaudeMapper } from "./provider/claude/ClaudeMapper.js";
export { GeminiMapper } from "./provider/gemini/GeminiMapper.js";
export { MistralMapper } from "./provider/mistral/MistralMapper.js";

// ── Utilities ─────────────────────────────────────────────────────────
export { config, getEnv } from "./utils/config.js";