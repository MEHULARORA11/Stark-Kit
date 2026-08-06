import { z } from "zod";
import type { IToolOptions } from "../types/tools";

// Defines and validates a tool with runtime type safety.
export function defineTool<T extends z.ZodType, R = any>(
  tool: IToolOptions<T, R>
): IToolOptions<T, R> {
  return {
    ...tool,
    execute: async (rawArgs: z.infer<T>): Promise<any> => {
      const parsed = tool.parameters.safeParse(rawArgs);
      if (!parsed.success) {
        console.error(`❌ [Tool: ${tool.name}] AI provided invalid arguments:`, rawArgs);
        return `Failed to execute tool. Invalid arguments: ${parsed.error.message}`;
      }
      console.log(`✅ [Tool: ${tool.name}] Executing with clean data:`, parsed.data);
      return tool.execute(parsed.data);
    }
  };
}