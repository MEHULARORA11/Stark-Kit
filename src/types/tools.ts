import { z } from "zod";

// ── Standardized Tool Output ──────────────────────────────────────────
/**
 * A standardized wrapper for tool execution results. Tools that return
 * this shape get first-class error handling in the run loop — a
 * `{ success: false }` result is reported back to the LLM as a tool
 * error without crashing the process.
 *
 * Tools MAY still return raw values (string, object, etc.) — the run
 * loop will detect the difference with `isToolResult()`.
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Runtime type-guard for distinguishing ToolResult wrappers from raw values. */
export function isToolResult(value: unknown): value is ToolResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as any).success === "boolean"
  );
}

// ── Tool Definition ───────────────────────────────────────────────────
/**
 * Definition options provided by the caller when registering a tool.
 *
 * `execute` may return either a raw value or a `ToolResult<R>` wrapper.
 * The run loop handles both — raw values are stringified, while
 * `ToolResult` wrappers get structured success/error handling.
 */
export interface IToolOptions<TParameters extends z.ZodType = z.ZodType, R = any> {
  name: string;
  description: string;
  parameters: TParameters;
  execute: (args: z.infer<TParameters>) => Promise<ToolResult<R> | R>;

  /**
   * When true, the run loop will pause before executing this tool
   * and yield a `requires_action` state to the caller for
   * human-in-the-loop approval.
   */
  requiresApproval?: boolean;
}