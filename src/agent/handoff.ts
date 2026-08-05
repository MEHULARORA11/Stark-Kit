// src/agent/handoff.ts
import type { Agent } from "./agent.js";
import type { IToolOptions } from "../types/tools.js";
import { z } from "zod";

// ── Handoff Sentinel ──────────────────────────────────────────────────
/**
 * Internal marker returned by handoff tools. The run loop checks for
 * this shape after each tool execution to detect agent transfers.
 */
export interface HandoffResult {
  __handoff: true;
  targetAgent: Agent;
}

/** Runtime type-guard for detecting handoff sentinels. */
export function isHandoffResult(value: unknown): value is HandoffResult {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as any).__handoff === true &&
    "targetAgent" in value
  );
}

// ── Handoff Tool Factory ──────────────────────────────────────────────
/**
 * Creates a tool that allows an agent to transfer control to another
 * agent (Swarm-style handoff). When the LLM calls this tool, the run
 * loop detects the handoff sentinel and swaps `activeAgent` without
 * returning to the caller.
 *
 * @example
 * ```ts
 * const billingAgent = new Agent({ ... });
 * const triageAgent = new Agent({
 *   tools: [createHandoffTool(billingAgent)],
 *   ...
 * });
 * ```
 */
export function createHandoffTool(targetAgent: Agent): IToolOptions {
  const safeName = targetAgent.name.replace(/[^a-zA-Z0-9_]/g, "_");

  return {
    name: `transfer_to_${safeName}`,
    description: `Transfer the conversation to the "${targetAgent.name}" agent. Use this when the user's request is better handled by that agent.`,
    parameters: z.object({
      reason: z
        .string()
        .optional()
        .describe("Brief reason for the handoff (for logging)."),
    }),
    execute: async (_args): Promise<HandoffResult> => {
      return { __handoff: true, targetAgent };
    },
  };
}
