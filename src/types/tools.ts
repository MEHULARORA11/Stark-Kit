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

  /**
   * Optional Zod schema describing the tool's output structure.
   * When provided, the JSON Schema representation is appended to
   * the tool's description so the LLM knows the exact shape of
   * the data it will receive back. `defineTool` also validates
   * the tool's return value against this schema at runtime.
   */
  outputType?: z.ZodType;
}

// ── Output Schema Helper ──────────────────────────────────────────────
/**
 * Builds the effective description for a tool. If `outputType` is set,
 * the Zod schema is converted to JSON Schema and appended to the
 * description so the LLM knows the expected output structure.
 *
 * All Mappers should call this instead of reading `tool.description`
 * directly, so the output schema is always communicated to the LLM.
 */
export function buildToolDescription(tool: IToolOptions): string {
  if (!tool.outputType) return tool.description;

  try {
    const outputJsonSchema = z.toJSONSchema(tool.outputType as any) as any;
    if (outputJsonSchema.$schema) delete outputJsonSchema.$schema;

    return (
      tool.description +
      `\n\nThis tool returns data conforming to the following JSON Schema:\n` +
      JSON.stringify(outputJsonSchema, null, 2)
    );
  } catch {
    // If schema conversion fails, fall back to the raw description
    return tool.description;
  }
}