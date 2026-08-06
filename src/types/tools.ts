import { z } from "zod";

// A standardized wrapper for tool execution results.
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Runtime type-guard for distinguishing ToolResult wrappers from raw values.
export function isToolResult(value: unknown): value is ToolResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as any).success === "boolean"
  );
}

// Definition options provided by the caller when registering a tool.
export interface IToolOptions<TParameters extends z.ZodType = z.ZodType, R = any> {
  name: string;
  description: string;
  parameters: TParameters;
  execute: (args: z.infer<TParameters>) => Promise<ToolResult<R> | R>;
  requiresApproval?: boolean;
}