import type { Agent } from "./agent.js";
import type { IToolOptions } from "../types/tools.js";
import { z } from "zod";

// Represents the result of an agent handoff operation.
export interface HandoffResult {
  __handoff: true;
  targetAgent: Agent;
}

// Determines if a value is a handoff result sentinel.
export function isHandoffResult(value: unknown): value is HandoffResult {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as any).__handoff === true &&
    "targetAgent" in value
  );
}

// Creates a tool that transfers conversation control to another agent.
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
