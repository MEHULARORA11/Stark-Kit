// src/types/agent.ts
import type { Provider } from "../provider/provider.js";
import type { IToolOptions } from "./tools.js";
import type { CanonicalMessage } from "./message.js";

// ── Guardrails: Lifecycle Hooks ───────────────────────────────────────
/**
 * Async hooks that run at key lifecycle points inside the agentic loop.
 * Each hook can inspect, modify, or block the value flowing through it.
 *
 * If a hook throws, the run loop catches the error and feeds it back
 * to the LLM as a system correction or tool error — it never crashes
 * the process.
 */
export interface AgentHooks {
  /**
   * Fires before every LLM call.
   * Receives the current history array.
   * - Return a modified copy to alter what the LLM sees.
   * - Return void / undefined to use the original.
   * - Throw to inject a system correction and skip this LLM call.
   */
  beforeChat?(history: CanonicalMessage[]): Promise<CanonicalMessage[] | void>;

  /**
   * Fires before each tool execution.
   * Receives the tool name and the parsed arguments.
   * - Return modified args to override what the tool receives.
   * - Return void / undefined to use the original args.
   * - Throw to block execution; the error string is sent back
   *   to the LLM as the tool's error result.
   */
  beforeTool?(toolName: string, args: unknown): Promise<unknown | void>;

  /**
   * Fires after each tool execution (or after a tool error).
   * Receives the tool name, result string, and error flag.
   * - Return a modified result string to sanitize/transform output.
   * - Return void / undefined to use the original.
   * - Throw to replace the result with the error string.
   */
  afterTool?(toolName: string, result: string, isError: boolean): Promise<string | void>;
}

// ── Agent Configuration ───────────────────────────────────────────────
export interface IAgentOptions {
  name: string;
  instructions: string; // The system prompt
  provider: Provider;
  tools?: IToolOptions[];
  maxSteps?: number;    // Prevents infinite while-loops
  temperature?: number;
  /** Overrides the provider's defaultModel for this agent. */
  model?: string;
  /** Lifecycle hooks for guardrails / validation. */
  hooks?: AgentHooks;
}